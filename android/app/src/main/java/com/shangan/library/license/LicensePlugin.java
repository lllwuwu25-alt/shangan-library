package com.shangan.library.license;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShanganLicense")
public class LicensePlugin extends Plugin {
    private boolean nativeReady;

    private static native String nativeCommand(String command, String license, String directory);

    @Override
    public void load() {
        try {
            System.loadLibrary("license_android");
            nativeReady = true;
        } catch (UnsatisfiedLinkError | SecurityException error) {
            nativeReady = false;
        }
    }

    @PluginMethod
    public void getLicenseStatus(PluginCall call) {
        run(call, "get_license_status", "");
    }

    @PluginMethod
    public void activateLicense(PluginCall call) {
        run(call, "activate_license", call.getString("license", ""));
    }

    @PluginMethod
    public void deactivateLicense(PluginCall call) {
        run(call, "deactivate_license", "");
    }

    private synchronized void run(PluginCall call, String command, String license) {
        if (!nativeReady) {
            call.reject("Local license verifier unavailable", "STORAGE_ERROR");
            return;
        }
        try {
            // The path is supplied by Android, never by the WebView or customer input.
            String directory = getContext().getFilesDir().getAbsolutePath();
            JSObject response = new JSObject(nativeCommand(command, license, directory));
            JSObject error = response.getJSObject("error");
            if (error != null) {
                call.reject("Local license validation failed", error.getString("code", "STORAGE_ERROR"));
            } else {
                JSObject status = response.getJSObject("status");
                if (status == null) call.reject("Invalid license response", "STORAGE_ERROR");
                else call.resolve(status);
            }
        } catch (Exception | LinkageError error) {
            call.reject("Local license operation failed", "STORAGE_ERROR");
        }
    }
}
