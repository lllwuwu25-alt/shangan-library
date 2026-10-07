package com.shangan.library;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import com.shangan.library.license.LicensePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LicensePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
