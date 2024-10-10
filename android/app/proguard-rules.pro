# Preserve AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Preserve React Native classes
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.** { *; }

# Preserve Reanimated library (if you're using it)
-keep class com.swmansion.reanimated.** { *; }

# Preserve your application's classes (replace with your actual package name)
-keep class com.route2.** { *; }

# Preserve TurboModules (if using)
-keep class com.facebook.react.turbomodule.** { *; }

# Preserve Hermes (if using)
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Preserve Context and other related classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Optional: Prevent obfuscation of class names for better debugging
-keepattributes SourceFile,LineNumberTable

# Keep SQLite classes
-keep class net.sqlcipher.** { *; }
-keep class android.database.sqlite.** { *; }
-keep class android.database.** { *; }
-keep class android.content.** { *; }
