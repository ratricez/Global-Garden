import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import os

print("TensorFlow version:", tf.__version__)

# Step 1: Load the data
print("\n📂 Loading data...")

def load_category(category):
    """Load and reshape a category"""
    data = np.load(f'data/{category}.npy')
    # Normalize pixel values to 0-1 range
    data = data.astype('float32') / 255.0
    # Reshape to 28x28x1 (grayscale images)
    data = data.reshape(-1, 28, 28, 1)
    return data

# Load flowers (label = 1)
flowers = load_category('flower')
flower_labels = np.ones(len(flowers))

# Load non-flowers (label = 0)
non_flower_categories = ['sun', 'face', 'house', 'tree', 'car']
non_flowers_list = []
for category in non_flower_categories:
    non_flowers_list.append(load_category(category))

non_flowers = np.concatenate(non_flowers_list)
non_flower_labels = np.zeros(len(non_flowers))

print(f"✓ Loaded {len(flowers)} flowers")
print(f"✓ Loaded {len(non_flowers)} non-flowers")

# Step 2: Combine and shuffle
print("\n Combining and shuffling data...")
X = np.concatenate([flowers, non_flowers])
y = np.concatenate([flower_labels, non_flower_labels])

# Shuffle
indices = np.random.permutation(len(X))
X = X[indices]
y = y[indices]

# Split into train/test (80/20 split)
split_idx = int(0.8 * len(X))
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

print(f"Training set: {len(X_train)} samples")
print(f"Test set: {len(X_test)} samples")

# Step 3: Build the model
print("\nBuilding CNN model...")

model = keras.Sequential([
    # IMPORTANT: Explicitly define input shape
    layers.Input(shape=(28, 28, 1)),
    
    # First convolutional layer
    layers.Conv2D(32, (3, 3), activation='relu'),
    layers.MaxPooling2D((2, 2)),
    
    # Second convolutional layer
    layers.Conv2D(64, (3, 3), activation='relu'),
    layers.MaxPooling2D((2, 2)),
    
    # Flatten and dense layers
    layers.Flatten(),
    layers.Dropout(0.3),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(1, activation='sigmoid')
])

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)

print(model.summary())

# Step 4: Train the model
print("\nTraining model...")
print("This will take a few minutes...")

history = model.fit(
    X_train, y_train,
    epochs=10,
    batch_size=128,
    validation_split=0.2,
    verbose=1
)

# Step 5: Evaluate
print("\nEvaluating on test set...")
test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
print(f"Test accuracy: {test_accuracy * 100:.2f}%")

# Step 6: Save the model
print("\nSaving model...")
model.save('flower_model.h5')
print("Model saved as 'flower_model.h5'")

# Test with a few examples
print("\nTesting predictions...")
test_samples = X_test[:5]
predictions = model.predict(test_samples, verbose=0)
for i, pred in enumerate(predictions):
    actual = "Flower" if y_test[i] == 1 else "Not Flower"
    predicted = "Flower" if pred > 0.5 else "Not Flower"
    confidence = pred[0] if pred > 0.5 else 1 - pred[0]
    print(f"Sample {i+1}: Predicted={predicted} ({confidence*100:.1f}%), Actual={actual}")

print("\nTraining complete!")