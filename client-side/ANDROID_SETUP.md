# Android Setup Guide

## Quick Fix: Use Web Instead (No Android SDK Needed)

If you just want to run the app quickly, use **web mode**:

```bash
npm run start-web
```

This opens in your browser - no Android SDK needed!

---

## Setting Up Android SDK (For Android Emulator)

### Step 1: Install Android Studio

1. Download from: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio
4. Go to **More Actions → SDK Manager**
5. Install:
   - ✅ **Android SDK Platform-Tools**
   - ✅ **Android SDK Command-line Tools (latest)**
   - ✅ At least one **Android SDK Platform** (e.g., Android 13.0)

### Step 2: Set Environment Variables

**Option A: Use the PowerShell script (Easiest)**
```powershell
# Run in PowerShell (as Administrator recommended)
.\setup-android.ps1
```

**Option B: Manual Setup**

1. Open **System Properties**:
   - Press `Win + R`
   - Type `sysdm.cpl` and press Enter
   - Go to **Advanced** tab → **Environment Variables**

2. Add **User Variables**:
   - **ANDROID_HOME** = `C:\Users\poova\AppData\Local\Android\Sdk`
   - **ANDROID_SDK_ROOT** = `C:\Users\poova\AppData\Local\Android\Sdk`

3. Edit **Path** variable (add these):
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

4. **Restart Cursor/Terminal** for changes to take effect

### Step 3: Verify Setup

```powershell
adb version
```

Should show: `Android Debug Bridge version X.X.X`

### Step 4: Run Expo

```bash
npm start
# Press 'a' for Android
```

---

## Alternative: Use Expo Go on Your Phone

No Android SDK needed! Just:

1. Install **Expo Go** app on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Run:
   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go app

---

## Troubleshooting

**"adb not recognized"**
- Make sure `platform-tools` is in your PATH
- Restart terminal/Cursor after setting environment variables

**"Android SDK path not found"**
- Check if Android Studio is installed
- Verify SDK location: Usually `C:\Users\YourUsername\AppData\Local\Android\Sdk`
- Set ANDROID_HOME to the correct path

**"No Android emulator found"**
- Open Android Studio → **More Actions → Virtual Device Manager**
- Create a new virtual device (AVD)
- Start the emulator before running `npm start`
