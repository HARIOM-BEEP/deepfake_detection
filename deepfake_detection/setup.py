from setuptools import setup, find_packages

setup(
    name='Deepfake_Detection',
    version='0.1.0',
    packages=find_packages(),
    install_requires=[
        'numpy',
        'scikit-learn',
        'joblib',
        'opencv-python',
        'mediapipe',
        'torch',
        'torchvision',
        'ultralytics',
        'xgboost',
        'flask',
    ],
    author='Your Name',
    author_email='your_email@example.com',
    description='A deepfake detection package.',
    url='https://github.com/HARIOM-BEEP/Deepfake_Detection',
)
