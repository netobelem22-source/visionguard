try { require('@tensorflow/tfjs-node'); } catch (_) {}

const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

(async () => {
  const modelPath = path.join(__dirname, '../models');
  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

  process.send({ tipo: 'pronto' });
  console.log('[FACE PROCESSOR] Modelos carregados');

  process.on('message', async ({ id, imagePath }) => {
    try {
      const img = await canvas.loadImage(imagePath);
      const rostos = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!rostos.length) {
        process.send({ id, descriptor: null });
        return;
      }

      process.send({ id, descriptor: Array.from(rostos[0].descriptor) });
    } catch (err) {
      console.error('[FACE PROCESSOR] Erro:', err.message);
      process.send({ id, descriptor: null, erro: err.message });
    }
  });
})();
