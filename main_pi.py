import firebase_admin
import random
import smtplib
import time
import suntime
import datetime
import requests
import socket
import paho.mqtt.client as mqtt
import cv2
import numpy as np
import threading
from firebase_admin import credentials, firestore
from ultralytics import YOLO
from flask import Flask, Response, make_response
import pygame

# ===== Setup Functions =====
def getIPAddress():
    hostname = socket.gethostname()
    IPAddr = socket.gethostbyname(hostname)
    print(IPAddr)
    return IPAddr

def setUpFirebase():
    cred = credentials.Certificate("senior-project-d84f7-firebase-adminsdk-fbsvc-d9f573a027.json")
    firebase_admin.initialize_app(cred)
    return firestore.client()

def getUser(db, deviceSerialNumber):
    docs = db.collection("nodes").stream()
    for doc in docs:
        jsonData = doc.to_dict()
        for serialNumber, info in jsonData.items():
            if serialNumber == deviceSerialNumber:
                return doc.id
    return ""

def updateNodeField(db, user, serialNumber, field, value):
    doc_ref = db.collection("nodes").document(user)
    data = doc_ref.get().to_dict()
    if serialNumber in data:
        data[serialNumber][field] = value
        db.collection("nodes").document(user).set(data, merge=True)
        print(f"Updated {field} for {serialNumber} to {value}")

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    topic = msg.topic
    print(f"[MQTT] {topic}: {payload}")

    parts = topic.split("/")
    if len(parts) < 3:
        return
    serialNumber = parts[1]  # Get serial from topic
    user = getUser(db, serialNumber)
    if not user:
        return

    if "fireStatus" in topic:
        updateNodeField(db, user, serialNumber, 'detectedFire', payload == 'true')
    elif "status" in topic:
        status = "Operational" if payload == "online" else "Offline"
        updateNodeField(db, user, serialNumber, 'operationalStatus', status)
    elif "pm1p0" in topic:
        updateNodeField(db, user, serialNumber, 'pm1p0', float(payload))
    elif "pm2p5" in topic:
        updateNodeField(db, user, serialNumber, 'pm2p5', float(payload))
    elif "pm4p0" in topic:
        updateNodeField(db, user, serialNumber, 'pm4p0', float(payload))
    elif "pm10p0" in topic:
        updateNodeField(db, user, serialNumber, 'pm10p0', float(payload))
    
    sendTextMessage(db, user)

def setSecondaryHubs(db, user, client):
    data = db.collection("nodes").document(user).get()
    if data.exists:
        jsonData = data.to_dict()
        for serialNumber, info in jsonData.items():
            if info.get('type') == 'Secondary':
                client.subscribe(f"hub/{serialNumber}/#")
                print(f"Subscribed to hub/{serialNumber}/#")

def sendTextMessage(db, user):
    data = db.collection("nodes").document(user).get()
    carriers = {
        "att": "@mms.att.net",
        "tmobile": "@tmomail.net",
        "verizon": "@vtext.com",
    }

    if data.exists:
        jsonData = data.to_dict()
        for serialNumber, info in jsonData.items():
            detectedFire = info.get('detectedFire', False)
            operationalStatus = info.get('operationalStatus', 'Unknown')

            lastStatus = lastAlerts.get(serialNumber, "none")

            alertType = "none"
            if detectedFire:
                alertType = "fire"
            elif operationalStatus == "Offline":
                alertType = "offline"

            if alertType != "none" and alertType != lastStatus:
                lastAlerts[serialNumber] = alertType  # update tracked status

                userData = db.collection("users").document(user).get().to_dict()
                phoneNumber = userData.get('phoneNumber')
                phoneCarrier = userData.get('phoneCarrier')
                carrier = carriers.get(phoneCarrier.lower(), None)

                if not (phoneNumber and carrier):
                    continue

                recipient = phoneNumber + carrier
                server = smtplib.SMTP("smtp.gmail.com", 587)
                server.starttls()
                server.login('pyrotectcsus@gmail.com', 'ymfu gydm wkdi tiyh')
                if alertType == "fire":
                    msg = f'Node {serialNumber} has Detected Fire! Contact emergency services.'
                elif alertType == "offline":
                    msg = f'Node {serialNumber} is Offline. Please check its connection.'
                else:
                    msg = ""

                if msg:
                    server.sendmail('Sac State Fire Department', recipient, msg)
                    print(f"Sent {alertType} alert for {serialNumber} to {recipient}")
                server.quit()

            elif alertType == "none":
                lastAlerts[serialNumber] = "none"  # clear previous alert

def checkPowerMode(user):
    doc_ref = db.collection("users").document(user)
    doc = doc_ref.get()
    firebaseData = doc.to_dict()
    sun = suntime.Sun(firebaseData["coordinates"]["latitude"], firebaseData["coordinates"]["longitude"])
    today_sr = sun.get_sunrise_time()
    today_ss = sun.get_sunset_time()
    now = datetime.datetime.now(datetime.timezone.utc)

    if now < today_sr.astimezone() or now > today_ss.astimezone():
        return "Low Power Mode"

    url = f'https://api.openweathermap.org/data/2.5/weather?lat={firebaseData["coordinates"]["latitude"]}&lon={firebaseData["coordinates"]["longitude"]}&appid=1d714cff2f42b81dd045c1f8fe7ab2ad'
    response = requests.get(url)
    weatherData = response.json()

    if weatherData["main"]["humidity"] > 50 or \
       weatherData["main"]["temp"] < 273.15 or \
       weatherData["clouds"]["all"] == 100:
        return "Low Power Mode"
    elif weatherData["main"]["temp"] > 310 or weatherData["wind"]["speed"] > 30:
        return "Full Power Mode"
    return "Normal Power Mode"

def sendPowerMode(serialNumber, powerMode):
    client.publish(f"hub/{serialNumber}/powerMode", powerMode)
    print(f"Sent {powerMode} to {serialNumber}")

# ====== Fire Detection for Main Hub ======
def detect_fire_main_hub():
    global Fire_Reported

    Fire_Reported = 0
    pygame.mixer.init()
    try:
        alarm_sound = pygame.mixer.Sound("/home/saywhy2me/Documents/SchoolWork/alarm.wav")  # Replace with actual path
    except Exception as e:
        print(f"Failed to load alarm.mp3: {e}")
        # Fallback to a generated sound
        sample_rate = 44100
        duration = 1.0
        freq = 440.0
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        audio = np.sin(2 * np.pi * freq * t) * 0.5
        audio = (audio * 32767).astype(np.int16)
        audio = np.stack((audio, audio), axis=1)  # Stereo
        alarm_sound = pygame.sndarray.make_sound(audio)

    model_path = "/home/saywhy2me/Documents/SchoolWork/comboYoloN.pt"
    model = YOLO(model_path, task='detect').to('cuda')
    video = cv2.VideoCapture(0)
    video.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    video.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    labels = model.names
    was_fire_detected = False
    last_fire_update_time = 0
    FIRE_UPDATE_COOLDOWN = 15  # seconds cooldown after a detection
    
    # Set bounding box colors (using the Tableau 10 color scheme)
    bbox_colors = [(164,120,87), (68,148,228), (93,97,209), (178,182,133), (88,159,106),
                  (96,202,231), (159,124,168), (169,162,241), (98,118,150), (172,176,184)]
    print("[YOLO] Fire detection thread started (using shared camera)")
    
    while True:
        # Use shared camera frame
        frame = camera.read()
        if frame is None:
            time.sleep(0.05)
            continue

        # Resize for YOLO (optional, but consistent)
        frame_resized = cv2.resize(frame, (1280, 720))

        # Run inference
        results = model(frame_resized)
        detections = results[0].boxes

        fire_detected = False
        object_count = 0

        for i in range(len(detections)):
            xyxy = detections[i].xyxy.cpu().numpy().squeeze().astype(int)
            xmin, ymin, xmax, ymax = xyxy

            classidx = int(detections[i].cls.item())
            classname = labels[classidx]
            conf = detections[i].conf.item()

            if conf > 0.5 and classname.lower() == 'fire':
                fire_detected = True
                object_count += 1
                color = bbox_colors[classidx % 10]
                cv2.rectangle(frame_resized, (xmin, ymin), (xmax, ymax), color, 2)

                label = f'{classname}: {int(conf*100)}%'
                labelSize, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                label_ymin = max(ymin, labelSize[1] + 10)
                cv2.rectangle(frame_resized, (xmin, label_ymin-labelSize[1]-10),
                            (xmin+labelSize[0], label_ymin+10), color, cv2.FILLED)
                cv2.putText(frame_resized, label, (xmin, label_ymin-7),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        current_time = time.time()

        if fire_detected != was_fire_detected and (current_time - last_fire_update_time) > FIRE_UPDATE_COOLDOWN:
            was_fire_detected = fire_detected
            last_fire_update_time = current_time

            user = getUser(db, deviceSerialNumber)
            if user:
                updateNodeField(db, user, deviceSerialNumber, 'detectedFire', fire_detected)
                if fire_detected:
                    Fire_Reported += 1
                    print("FIRE DETECTED ON MAIN HUB!")
                    alarm_sound.play()
                    sendTextMessage(db, user)
                else:
                    print("Fire cleared.")
                    alarm_sound.stop()

        # Show YOLO output
        cv2.imshow('YOLO Fire Detection (Main Hub)', frame_resized)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        time.sleep(0.1)  # Reduce CPU load

    cv2.destroyAllWindows()
    alarm_sound.stop()
    pygame.mixer.quit()
    
    
# ---------------- Camera manager (shared between Flask & YOLO) ----------------
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
        self.ready.wait(timeout=3.0)
        return self

    def _run(self):
        while not self.stopped.is_set():
            if self.cap is None:
                self.cap = cv2.VideoCapture(self.src)
                if not self.cap.isOpened():
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

            h, w = frame.shape[:2]
            if self.target_width and w > self.target_width:
                new_h = int(h * (self.target_width / w))
                frame = cv2.resize(frame, (self.target_width, new_h), interpolation=cv2.INTER_AREA)

            with self.lock:
                self.frame = frame
            self.ready.set()

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

# ---------------- Flask Video Server ----------------
app = Flask(__name__)

HTTP_HOST = "0.0.0.0"
HTTP_PORT = 5000
#DEVICE_SERIAL = deviceSerialNumber  # "H42802"

@app.get("/node/<serial>")
def node_video(serial):
    if serial != DEVICE_SERIAL:
        return {"error": "unknown device"}, 404
    if camera is None:
        return {"error": "camera not ready"}, 503
    return Response(camera.generate_mjpeg(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.get("/snapshot")
def snapshot():
    if camera is None:
        return {"error": "camera not ready"}, 503
    jpg = camera.jpeg_bytes(quality=85)
    if jpg is None:
        return {"error": "no frame"}, 503
    resp = make_response(jpg)
    resp.headers["Content-Type"] = "image/jpeg"
    resp.headers["Cache-Control"] = "no-store"
    return resp

def start_http_server():
    app.run(host=HTTP_HOST, port=HTTP_PORT, debug=False, threaded=True, use_reloader=False)




# ====== Main Execution ======
deviceSerialNumber = "H42802"
#camera = None  # Shared camera instance
DEVICE_SERIAL = deviceSerialNumber
mqtt_broker_ip = getIPAddress()
db = setUpFirebase()
client = mqtt.Client()
client.on_message = on_message
client.connect(mqtt_broker_ip, 1883)
client.loop_start()
lastAlerts = {}

#Start shared camera feed between yolo and flask
global camera
camera = CameraFeed(src=0, target_width=1280).start()
print("Camera feed started.")


# Start Flask HTTP Server in a separate thread
http_thread = threading.Thread(target=start_http_server, daemon=True)
http_thread.start()
print(f"HTTP server started at http://{HTTP_HOST}:{HTTP_PORT}/node/{DEVICE_SERIAL}")

# find user associated with this main hub and set up subscriptions

user = ""
while user == "":
    user = getUser(db, deviceSerialNumber)
setSecondaryHubs(db, user, client)

# Start Fire Detection Thread
fire_thread = threading.Thread(target=detect_fire_main_hub, daemon=True)
fire_thread.start()

lastPowerMode = None
while True:
    powerMode = checkPowerMode(user)
    if powerMode != lastPowerMode:
        setSecondaryHubs(db, user, client)
        data = db.collection("nodes").document(user).get()
        jsonData = data.to_dict()
        for serialNumber, info in jsonData.items():
            if info.get("type") == "Secondary":
                sendPowerMode(serialNumber, powerMode)
        lastPowerMode = powerMode

    time.sleep(5 if powerMode == "Full Power Mode" else 10 if powerMode == "Normal Power Mode" else 20)