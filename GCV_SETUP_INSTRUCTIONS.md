# Google Cloud Vision Setup Instructions for LegalSphere

To enable high-performance, multi-lingual OCR (specifically for mixed English and Urdu text) in the LegalSphere application, you must configure a Google Cloud Vision API key using environment variables.

## Step-by-Step Guide

1. **Access Google Cloud Console:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com).
   - Log in with your Google account.

2. **Create or Select a Project:**
   - Click on the project dropdown in the top navigation bar.
   - Select an existing project or click **New Project** and follow the prompts to create one (e.g., "LegalSphere-OCR").

3. **Enable the Cloud Vision API:**
   - Open the navigation menu (hamburger icon) on the left.
   - Go to **APIs & Services** > **Library**.
   - Search for **Cloud Vision API**.
   - Click on the **Cloud Vision API** result and then click **Enable**.

4. **Generate an API Key:**
   - Go to **APIs & Services** > **Credentials**.
   - Click the **+ Create Credentials** button at the top.
   - Select **API key** from the dropdown menu.
   - A modal will appear displaying your new API key. **Copy this key.**

5. **Secure Your API Key (Highly Recommended):**
   - In the API key creation modal or by clicking on the API key name in the list, go to the key restrictions settings.
   - Under **Application restrictions**, depending on how your Expo app is built, you can restrict it by Android apps (package name and SHA-1 signing-certificate fingerprint) and iOS apps (bundle ID).
   - Under **API restrictions**, select **Restrict key** and check **Cloud Vision API**. This ensures the key can only be used for OCR and no other Google Cloud services.
   - Click **Save**.

6. **Integrate the Key into LegalSphere:**
   - In the root of your project, create a file named `.env` if it doesn't already exist.
   - Add the following line to the `.env` file, replacing `YOUR_API_KEY_HERE` with your actual key:
     ```
     EXPO_PUBLIC_GOOGLE_VISION_API_KEY=YOUR_API_KEY_HERE
     ```
   - *Note: Ensure `.env` is listed in your `.gitignore` so your API key is not committed to version control.*

## Verification

Once configured, restart your Expo development server and clear the cache (`npx expo start -c`), then test the application by uploading:
- An image containing pure English text.
- An image containing pure Urdu text (e.g., FIR, court order).
- An image with mixed English and Urdu text.
- A scanned PDF document (up to 5 pages).

The system will automatically detect the languages and extract the text perfectly as UTF-8 characters.
