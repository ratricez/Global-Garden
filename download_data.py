import requests
import numpy as np
import os

def download_quickdraw_data(category, max_samples=5000):
    """
    Download Quick Draw dataset for a specific category
    """
    print(f"Downloading {category} data...")
    
    # Quick Draw dataset URL
    base_url = "https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap"
    url = f"{base_url}/{category}.npy"
    
    # Create data directory if it doesn't exist
    if not os.path.exists('data'):
        os.makedirs('data')
    
    # Download the file
    response = requests.get(url)
    
    if response.status_code == 200:
        # Save to file
        filepath = f'data/{category}.npy'
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        # Load and limit samples
        data = np.load(filepath)
        if len(data) > max_samples:
            data = data[:max_samples]
            np.save(filepath, data)
        
        print(f"✓ Downloaded {len(data)} {category} drawings")
        return data
    else:
        print(f"✗ Failed to download {category}")
        return None

# Download flower category (positive examples)
download_quickdraw_data('flower', max_samples=5000)

# Download non-flower categories (negative examples)
non_flower_categories = ['sun', 'face', 'house', 'tree', 'car']
for category in non_flower_categories:
    download_quickdraw_data(category, max_samples=1000)

print("\n✓ All data downloaded to 'data/' folder!")