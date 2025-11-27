import time
import sys
import signal
import threading

import cv2
import numpy as np
import paho.mqtt.client as mqtt
from flask import Flask, Response, jsonify, make_response

from sensirion_i2c_driver import LinuxI2cTransceiver, I2cConnection, CrcCalculator
from sensirion_driver_adapters.i2c_adapter.i2c_channel import I2cChannel
from sensirion_i2c_sen66.device import Sen66Device

# ================== CONFIG ==================
# MQTT
broker_ip = "10.100.133.70"
port = 1883
DEVICE_SERIAL = "A50942"

def topic(suffix: str) -> str:
    return f"hub/{DEVICE_SERIAL}/{suffix}"

assignedUser = ""
powerMode = "Normal Power Mode"

# I2C (Raspberry Pi)
I2C_PORT = "/dev/i2c-1"
I2C_ADDR = 0x6B

# Flask
HTTP_HOST = "0.0.0.0"
HTTP_PORT = 5000

# ===============================================================

class SensorData:
    def __init__(self,
                 ppmAverage: float = 0.0,
                 massConcentrationPm1p0: float = 0.0,
                 massConcentrationPm2p5: float = 0.0,
                 massConcentrationPm4p0: float = 0.0,
                 massConcentrationPm10p0: float = 0.0,
                 humidity: float = 0.0,
                 temperature: float = 0.0,
                 vocIndex: float = 0.0,
                 noxIndex: float = 0.0,
                 co2: int = 0):
        self.ppmAverage = ppmAverage
        self.massConcentrationPm1p0 = massConcentrationPm1p0
        self.massConcentrationPm2p5 = massConcentrationPm2p5
        self.massConcentrationPm4p0 = massConcentrationPm4p0
        self.massConcentrationPm10p0 = massConcentrationPm10p0
        self.humidity = humidity
        self.temperature = temperature
        self.vocIndex = vocIndex
        self.noxIndex = noxIndex
        self.co2 = co2

# ---------------- Camera manager (single capture shared) ----------------
class CameraFeed:
    def __init__(self, src=0, target_width=1280):
        self.src = src
        self.target_width = target_width
        self.cap = None
        self.lock = threading.Lock()
        self.frame = None
        self.stopped = threading.Event()
        self.ready = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self.thread.start()
        self.ready.wait(timeout=3.0)  # non-fatal if it times out
        return self

    def _run(self):
        while not self.stopped.is_set():
            if self.cap is None:
                self.cap = cv2.VideoCapture(self.src)
                if not self.cap.isOpened():
                    # Retry later if unavailable
                    try:
                        self.cap.release()
                    except Exception:
                        pass
                    self.cap = None
                    time.sleep(1.0)
                    continue

            ok, frame = self.cap.read()
            if not ok:
                time.sleep(0.05)
                continue

            # Resize down to target width to save bandwidth/CPU
            h, w = frame.shape[:2]
            if self.target_width and w > self.target_width:
                new_h = int(h * (self.target_width / w))
                frame = cv2.resize(frame, (self.target_width, new_h), interpolation=cv2.INTER_AREA)

            with self.lock:
                self.frame = frame
            self.ready.set()

        # Cleanup
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass

    def read(self):
        with self.lock:
            if self.frame is None:
                return None
            return self.frame.copy()

    def jpeg_bytes(self, quality=80):
        frame = self.read()
        if frame is None:
            return None
        ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        return buf.tobytes() if ok else None

    def generate_mjpeg(self):
        boundary = b"--frame"
        while not self.stopped.is_set():
            jpg = self.jpeg_bytes(quality=80)
            if jpg is None:
                time.sleep(0.05)
                continue
            yield (boundary + b"\r\nContent-Type: image/jpeg\r\nContent-Length: "
                   + str(len(jpg)).encode() + b"\r\n\r\n" + jpg + b"\r\n")

    def stop(self):
        self.stopped.set()
        self.thread.join(timeout=1.0)

# Globals for I2C lifetime objects
i2c_transceiver = None
i2c_connection = None
sensor = None
sensor_data = None
camera = None

# ---------------- MQTT callbacks ----------------
def on_connect(client, userdata, flags, rc):
    client.subscribe(topic("assignUser"))
    client.subscribe(topic("powerMode"))

def on_message(client, userdata, msg):
    global assignedUser, powerMode
    if msg.topic == topic("assignUser"):
        assignedUser = msg.payload.decode()
        print(f"[MQTT] Assigned user: {assignedUser}")
    elif msg.topic == topic("powerMode"):
        powerMode = msg.payload.decode()
        print(f"[MQTT] Power mode set to: {powerMode}")

# ---------------- Fire detection (uses shared camera frames) ----------------
def detect_fire(camera_feed: CameraFeed):
    """
    Uses the shared CameraFeed instead of opening the camera each call.
    Returns True if fire-like activity is detected across multiple frames.
    """
    if camera_feed is None:
        return False

    total_frames = 6
    delay_s = 0.20

    SMALL_FLAME_MIN_AREA = 100
    LARGE_FLAME_MIN_AREA = 800
    BRIGHT_V_MIN = 185

    TINY_MIN_AREA = 20
    HOT_V = 230
    HOT_S = 140
    HOT_PCT_MIN = 0.35
    MOTION_PCT_MIN = 0.10

    fire_frames = 0
    prev_gray = None
    k3 = np.ones((3, 3), np.uint8)

    for i in range(total_frames):
        frame = camera_feed.read()
        if frame is None:
            time.sleep(delay_s)
            continue

        blur = cv2.GaussianBlur(frame, (5, 5), 0)
        hsv = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)

        red1_lo, red1_hi = (0,   100, 120), (12, 255, 255)
        red2_lo, red2_hi = (165, 100, 120), (180, 255, 255)
        oy_lo,   oy_hi   = (8,   100, 140), (50, 255, 255)
        blue_lo, blue_hi = (92,  100, 120), (128, 255, 255)

        m_red1 = cv2.inRange(hsv, np.array(red1_lo), np.array(red1_hi))
        m_red2 = cv2.inRange(hsv, np.array(red2_lo), np.array(red2_hi))
        m_oy   = cv2.inRange(hsv, np.array(oy_lo),   np.array(oy_hi))
        m_blue = cv2.inRange(hsv, np.array(blue_lo), np.array(blue_hi))
        color_mask = cv2.bitwise_or(cv2.bitwise_or(m_red1, m_red2), cv2.bitwise_or(m_oy, m_blue))
        color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_CLOSE, k3, iterations=1)

        gray = cv2.cvtColor(blur, cv2.COLOR_BGR2GRAY)
        if prev_gray is None:
            motion_mask = np.zeros_like(gray)
        else:
            diff = cv2.absdiff(gray, prev_gray)
            _, motion_mask = cv2.threshold(diff, 6, 255, cv2.THRESH_BINARY)
            motion_mask = cv2.dilate(motion_mask, k3, iterations=1)
        prev_gray = gray

        V = hsv[:, :, 2]
        S = hsv[:, :, 1]
        _, vhot = cv2.threshold(V, HOT_V, 255, cv2.THRESH_BINARY)
        _, shot = cv2.threshold(S, HOT_S, 255, cv2.THRESH_BINARY)
        hot_mask = cv2.bitwise_and(vhot, shot)

        # Primary pathway: color + motion
        comb_primary = cv2.bitwise_and(color_mask, motion_mask)
        contours_p, _ = cv2.findContours(comb_primary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        found = False
        for cnt in contours_p:
            area = cv2.contourArea(cnt)
            if area < TINY_MIN_AREA:
                continue
            mask_cnt = np.zeros_like(V, dtype=np.uint8)
            cv2.drawContours(mask_cnt, [cnt], -1, 255, -1)
            mean_v = cv2.mean(V, mask=mask_cnt)[0]
            if (area >= SMALL_FLAME_MIN_AREA and mean_v >= BRIGHT_V_MIN) or (area >= LARGE_FLAME_MIN_AREA):
                found = True
                break

        if not found:
            comb_hot = cv2.bitwise_and(color_mask, hot_mask)
            contours_h, _ = cv2.findContours(comb_hot, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours_h:
                area = cv2.contourArea(cnt)
                if area < TINY_MIN_AREA:
                    continue
                mask_cnt = np.zeros_like(V, dtype=np.uint8)
                cv2.drawContours(mask_cnt, [cnt], -1, 255, -1)
                hot_inside = cv2.countNonZero(cv2.bitwise_and(mask_cnt, hot_mask))
                motion_inside = cv2.countNonZero(cv2.bitwise_and(mask_cnt, motion_mask))
                pct_hot = hot_inside / max(area, 1)
                pct_motion = motion_inside / max(area, 1)
                if area >= TINY_MIN_AREA and pct_hot >= HOT_PCT_MIN and pct_motion >= MOTION_PCT_MIN:
                    found = True
                    break

        if found:
            fire_frames += 1

        if i < total_frames - 1:
            time.sleep(delay_s)

    return fire_frames >= 3

def readSen66Sensor():
    """
    Returns True if averaged particulate >= 500.0, else False.
    If sensor isn't initialized, returns False and leaves data at zeros.
    """
    global sensor, sensor_data
    if sensor is None:
        return False
    try:
        (pm1p0, pm2p5, pm4p0, pm10p0,
         humidity, temperature,
         voc_index, nox_index, co2) = sensor.read_measured_values()

        sensor_data.massConcentrationPm1p0 = float(pm1p0.value)
        sensor_data.massConcentrationPm2p5 = float(pm2p5.value)
        sensor_data.massConcentrationPm4p0 = float(pm4p0.value)
        sensor_data.massConcentrationPm10p0 = float(pm10p0.value)
        sensor_data.humidity = float(humidity.value)
        sensor_data.temperature = float(temperature.value)
        sensor_data.vocIndex = float(voc_index.value)
        sensor_data.noxIndex = float(nox_index.value)
        sensor_data.co2 = int(co2.value)

        sensor_data.ppmAverage = (
            sensor_data.massConcentrationPm1p0 +
            sensor_data.massConcentrationPm2p5 +
            sensor_data.massConcentrationPm4p0 +
            sensor_data.massConcentrationPm10p0
        ) / 4.0

        return sensor_data.ppmAverage >= 500.0
    except Exception as e:
        print(f"[I2C] read failed: {e!r}")
        return False

# ---------------- Flask app ----------------
app = Flask(__name__)

@app.get("/node/<serial>")
def node_video(serial):
    if serial != DEVICE_SERIAL:
        return jsonify({"error": "unknown device"}), 404
    if camera is None:
        return jsonify({"error": "camera not ready"}), 503
    return Response(camera.generate_mjpeg(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.get("/snapshot")
def snapshot():
    if camera is None:
        return jsonify({"error": "camera not ready"}), 503
    jpg = camera.jpeg_bytes(quality=85)
    if jpg is None:
        return jsonify({"error": "no frame"}), 503
    resp = make_response(jpg)
    resp.headers["Content-Type"] = "image/jpeg"
    resp.headers["Cache-Control"] = "no-store"
    return resp

@app.get("/health")
def health():
    ok = camera is not None
    payload = {
        "device": DEVICE_SERIAL,
        "camera": bool(ok),
        "assignedUser": assignedUser,
        "powerMode": powerMode
    }
    return jsonify(payload), 200

def start_http_server():
    app.run(host=HTTP_HOST, port=HTTP_PORT, debug=False, threaded=True, use_reloader=False)

# ---------------- Main ----------------
def main():
    global sensor_data, sensor, i2c_transceiver, i2c_connection, camera
    sensor_data = SensorData()

    # Start shared camera
    camera = CameraFeed(src=0, target_width=1280).start()

    # Start HTTP server (daemon thread)
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()
    print(f"[HTTP] Serving on http://{HTTP_HOST}:{HTTP_PORT}/node/{DEVICE_SERIAL}")

    # MQTT
    client = mqtt.Client(client_id=f"hub-{DEVICE_SERIAL}")
    client.on_connect = on_connect
    client.on_message = on_message
    client.will_set(topic("status"), "offline", qos=1, retain=True)

    try:
        client.connect(broker_ip, port, keepalive=30)
    except Exception as e:
        print(f"[MQTT] Connection error: {e}")
        sys.exit(2)

    client.loop_start()
    client.publish(topic("status"), "online", qos=1, retain=True)

    # I2C init
    try:
        i2c_transceiver = LinuxI2cTransceiver(I2C_PORT)
        i2c_connection = I2cConnection(i2c_transceiver)
        channel = I2cChannel(
            i2c_connection,
            slave_address=I2C_ADDR,
            crc=CrcCalculator(8, 0x31, 0xff, 0x0)
        )
        sensor = Sen66Device(channel)
        sensor.device_reset()
        time.sleep(1.5)
        serial_number = sensor.get_serial_number()
        sensor.start_continuous_measurement()
        print(f"[I2C] SEN66 serial_number: {serial_number}")
    except Exception as e:
        sensor = None
        print(f"[I2C] Sensor init failed (continuing without SEN66): {e}")

    stop_flag = {"stop": False}
    def handle_sigint(signum, frame):
        stop_flag["stop"] = True
    signal.signal(signal.SIGINT, handle_sigint)

    print("[System] Started. Headless mode. Ctrl+C to stop.")

    try:
        while not stop_flag["stop"]:
            if powerMode == "Low Power Mode":
                interval = 20
            elif powerMode == "Full Power Mode":
                interval = 5
            else:
                interval = 10

            t_end = time.time() + interval
            while time.time() < t_end:
                if stop_flag["stop"]:
                    break
                time.sleep(0.1)
            if stop_flag["stop"]:
                break

            # Sensing & detection
            fire_camera = detect_fire(camera)
            fire_sensor = readSen66Sensor()
            fire_detected = (fire_camera and fire_sensor)

            # Publish telemetry
            client.publish(topic("fireStatus"), "true" if fire_detected else "false", qos=1, retain=True)
            client.publish(topic("ppmAverage"), str(round(sensor_data.ppmAverage, 2)), qos=0, retain=False)
            client.publish(topic("pm1p0"), str(round(sensor_data.massConcentrationPm1p0, 2)), qos=0, retain=False)
            client.publish(topic("pm2p5"), str(round(sensor_data.massConcentrationPm2p5, 2)), qos=0, retain=False)
            client.publish(topic("pm4p0"), str(round(sensor_data.massConcentrationPm4p0, 2)), qos=0, retain=False)
            client.publish(topic("pm10p0"), str(round(sensor_data.massConcentrationPm10p0, 2)), qos=0, retain=False)
            client.publish(topic("humidity"), str(round(sensor_data.humidity, 2)), qos=0, retain=False)
            client.publish(topic("temperature"), str(round(sensor_data.temperature, 2)), qos=0, retain=False)
            client.publish(topic("vocIndex"), str(round(sensor_data.vocIndex, 2)), qos=0, retain=False)
            client.publish(topic("noxIndex"), str(round(sensor_data.noxIndex, 2)), qos=0, retain=False)
            client.publish(topic("co2"), str(sensor_data.co2), qos=0, retain=False)
            client.publish(topic("status"), "online", qos=1, retain=True)

            print(f"[Detect] Fire: {fire_detected} | mode={powerMode} | cam={fire_camera} | sen66={fire_sensor}")
    finally:
        try:
            if i2c_transceiver is not None:
                i2c_transceiver.close()
        except Exception:
            pass
        try:
            client.publish(topic("status"), "offline", qos=1, retain=True)
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass
        try:
            if camera is not None:
                camera.stop()
        except Exception:
            pass
        print("[System] Clean exit.")

if __name__ == "__main__":
    main()
