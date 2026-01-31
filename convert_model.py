import tensorflowjs as tfjs
from tensorflow import keras

print("📦 Converting model to TensorFlow.js format...")

# Load the trained model
model = keras.models.load_model('flower_model.h5')

# Convert and save
tfjs.converters.save_keras_model(model, 'model')

print("✓ Model converted and saved to 'model/' folder!")
print("✓ You should see: model.json and group1-shard1of1.bin")