from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from detector import detector
from utils import preprocess_image

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load detection model (if available)
# detector.load_model('path/to/model.h5')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Deepfake detection service is running'
    })

@app.route('/api/detect', methods=['POST'])
def detect_deepfake():
    """
    Detect deepfake in uploaded image
    
    Expected request body:
    {
        "image": "base64_encoded_image_data"
    }
    
    Returns:
    {
        "result": "real" | "fake" | "uncertain",
        "confidence": 0.0 - 1.0
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'error': 'No image data provided'
            }), 400
        
        # Preprocess image
        image = preprocess_image(data['image'])
        
        if image is None:
            return jsonify({
                'error': 'Failed to process image'
            }), 400
        
        # Detect deepfake
        result = detector.detect(image)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in detect endpoint: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/batch-detect', methods=['POST'])
def batch_detect():
    """
    Detect deepfakes in multiple images
    
    Expected request body:
    {
        "images": ["base64_image1", "base64_image2", ...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'images' not in data:
            return jsonify({
                'error': 'No images provided'
            }), 400
        
        results = []
        for img_data in data['images']:
            image = preprocess_image(img_data)
            if image is not None:
                result = detector.detect(image)
                results.append(result)
            else:
                results.append({
                    'result': 'uncertain',
                    'confidence': 0.0,
                    'message': 'Failed to process image'
                })
        
        return jsonify({
            'results': results
        })
        
    except Exception as e:
        print(f"Error in batch detect endpoint: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting deepfake detection service on port {port}")
    print("=" * 50)
    print("NOTE: This is a placeholder implementation.")
    print("Please integrate a real deepfake detection model for production use.")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
