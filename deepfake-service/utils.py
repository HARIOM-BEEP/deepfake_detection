import cv2
import numpy as np
from PIL import Image
import io
import base64

def preprocess_image(image_data):
    """
    Preprocess image for deepfake detection model
    
    Args:
        image_data: Base64 encoded image string or bytes
        
    Returns:
        Preprocessed image as numpy array
    """
    try:
        # Handle base64 encoded images
        if isinstance(image_data, str):
            # Remove data URL prefix if present
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = image_data
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        return img_array
        
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None

def extract_face(image):
    """
    Extract face from image using OpenCV Haar Cascade
    
    Args:
        image: Image as numpy array
        
    Returns:
        Face region as numpy array or None if no face detected
    """
    try:
        # Load face cascade
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        if len(faces) > 0:
            # Get the largest face
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            face = image[y:y+h, x:x+w]
            return face
        
        return None
        
    except Exception as e:
        print(f"Error extracting face: {e}")
        return None

def resize_image(image, target_size=(224, 224)):
    """
    Resize image to target size
    
    Args:
        image: Image as numpy array
        target_size: Tuple of (width, height)
        
    Returns:
        Resized image
    """
    return cv2.resize(image, target_size)

def normalize_image(image):
    """
    Normalize image pixel values to [0, 1]
    
    Args:
        image: Image as numpy array
        
    Returns:
        Normalized image
    """
    return image.astype(np.float32) / 255.0
