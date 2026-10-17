package io.github.jay2h.runnershigh;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.view.*;
import android.graphics.Color;
import androidx.webkit.WebViewAssetLoader;
public class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  web = new WebView(this);
  web.setBackgroundColor(Color.rgb(16,25,27));
  setContentView(web);
  if (android.os.Build.VERSION.SDK_INT >= 30) web.setOnApplyWindowInsetsListener((v,insets)->{
   android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
   v.setPadding(bars.left,bars.top,bars.right,bars.bottom);
   return insets;
  });
  // API 26-29 use the platform's fitted content area.

  WebSettings s=web.getSettings();
  s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false); s.setAllowContentAccess(false);
  s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
   .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return loader.shouldInterceptRequest(r.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
    return !("https".equals(r.getUrl().getScheme()) && "appassets.androidplatform.net".equals(r.getUrl().getHost()));
   }
  });
  web.setWebChromeClient(new WebChromeClient());
  web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
 }
 @Override protected void onPause(){
  web.evaluateJavascript("window.dispatchEvent(new Event('beforeunload'));",null);
  web.onPause(); super.onPause();
 }
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override public void onBackPressed(){
  new android.app.AlertDialog.Builder(this).setMessage("게임을 저장하고 종료할까요?")
   .setPositiveButton("종료",(d,w)->web.evaluateJavascript("window.dispatchEvent(new Event('beforeunload'));",r->finish()))
   .setNegativeButton("계속하기",null).show();
 }
}
