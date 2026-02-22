# PowerShell script to set Android SDK environment variables
# Run this script as Administrator or set variables for current user

Write-Host "Setting up Android SDK environment variables..." -ForegroundColor Cyan

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"

if (Test-Path $sdkPath) {
    Write-Host "Found Android SDK at: $sdkPath" -ForegroundColor Green
    
    # Set ANDROID_HOME for current session
    $env:ANDROID_HOME = $sdkPath
    $env:ANDROID_SDK_ROOT = $sdkPath
    
    # Add platform-tools to PATH for current session
    $platformTools = "$sdkPath\platform-tools"
    if (Test-Path $platformTools) {
        if ($env:PATH -notlike "*$platformTools*") {
            $env:PATH = "$platformTools;$env:PATH"
        }
        Write-Host "Added platform-tools to PATH" -ForegroundColor Green
    }
    
    # Set permanently for current user
    [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
    [System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkPath, "User")
    
    Write-Host "`nEnvironment variables set successfully!" -ForegroundColor Green
    Write-Host "ANDROID_HOME = $sdkPath" -ForegroundColor Yellow
    Write-Host "`nPlease restart your terminal/Cursor for changes to take effect." -ForegroundColor Yellow
    Write-Host "Or run: refreshenv" -ForegroundColor Yellow
} else {
    Write-Host "Android SDK not found at: $sdkPath" -ForegroundColor Red
    Write-Host "`nPlease install Android Studio first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "2. Install Android Studio" -ForegroundColor White
    Write-Host "3. Open Android Studio > SDK Manager" -ForegroundColor White
    Write-Host "4. Install 'Android SDK Platform-Tools' and 'Android SDK Command-line Tools'" -ForegroundColor White
    Write-Host "5. Run this script again" -ForegroundColor White
}

Write-Host "`nTo verify, run: adb version" -ForegroundColor Cyan
