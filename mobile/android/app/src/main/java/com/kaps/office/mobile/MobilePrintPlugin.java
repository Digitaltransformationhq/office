package com.kaps.office.mobile;

import android.content.Context;
import android.print.PrintManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Android system print dialog for the current WebView page. */
@CapacitorPlugin(name = "MobilePrint")
public class MobilePrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (manager == null) {
                    call.reject("Printing is unavailable on this device");
                    return;
                }
                manager.print("KAPS Office", getBridge().getWebView().createPrintDocumentAdapter("KAPS Office"), null);
                call.resolve(new JSObject());
            } catch (Exception error) {
                call.reject("Unable to start printing", error);
            }
        });
    }
}
