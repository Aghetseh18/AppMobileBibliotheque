# Deployment Guide: Library Mobile Application

This document outlines the procedures for setting up the development environment, building the application locally and via cloud services, and the configured CI/CD pipelines.

## 1. Prerequisites

Ensure the following tools are installed on your development machine:
-   **Node.js** (v18 or later)
-   **npm** (Node Package Manager)
-   **Expo CLI**: `npm install -g expo-cli`
-   **EAS CLI**: `npm install -g eas-cli`

## 2. Local Development Setup

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd AppMobileBibliotheque
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Development Server**:
    ```bash
    npm start
    ```
    Use the Expo Go app on your physical device or an emulator to scan the QR code.

## 3. Expo Application Services (EAS) Build

The project uses EAS Build for generating installable binaries (APK/AAB).

### Configuration (`eas.json`)
There are three build profiles defined:
-   **Development**: For internal testing with development clients.
-   **Preview**: For internal distribution (APK).
-   **Production**: For Play Store submission.

### Running a Build
To build an Android APK manually:

1.  **Login to Expo**:
    ```bash
    eas login
    ```

2.  **Trigger Build**:
    ```bash
    eas build --platform android --profile preview
    ```
    Follow the interactive prompts. Once finished, a download link for the APK will be provided.

## 4. Continuous Integration (CI/CD)

Automated builds are configured using **GitHub Actions**.

### Workflow: `build.yml`
-   **Trigger**: Pushes and Pull Requests to the `main` branch.
-   **Environment**: Windows Latest runner.
-   **Process**:
    1.  Check out code.
    2.  Install Node.js & dependencies.
    3.  Install EAS CLI.
    4.  Authenticate using `EXPO_TOKEN` (stored in GitHub Secrets).
    5.  Run `eas build --platform android --profile preview --non-interactive`.
    6.  Upload the generated APK as a build artifact.

### Secrets Configuration
For the CI pipeline to function, the following secret must be set in the GitHub Repository Settings:
-   `EXPO_TOKEN`: Your Expo access token.

## 5. Backend Services
-   **Firebase**: Used for Authentication and Firestore Database. Ensure `firebaseConfig.js` contains valid credentials.
-   **Gemini AI**: key managed in `gemini.js` for ChatBot functionality.
