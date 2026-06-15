from fastapi import FastAPI, UploadFile, File
from ultralytics import YOLO
import cv2
import numpy as np

app = FastAPI()

model = YOLO("yolov8n.pt")

@app.get("/")
def home():

    return {
        "status": "VisionGuard AI Online"
    }

@app.post("/detectar")
async def detectar(
    file: UploadFile = File(...)
):

    contents = await file.read()

    npimg = np.frombuffer(
        contents,
        np.uint8
    )

    img = cv2.imdecode(
        npimg,
        cv2.IMREAD_COLOR
    )

    results = model(img)

    deteccoes = []

    for r in results:

        boxes = r.boxes

        for box in boxes:

            classe = int(
                box.cls[0]
            )

            confianca = float(
                box.conf[0]
            )

            deteccoes.append({

                "classe": classe,
                "confianca": confianca

            })

    return {
        "deteccoes": deteccoes
    }
