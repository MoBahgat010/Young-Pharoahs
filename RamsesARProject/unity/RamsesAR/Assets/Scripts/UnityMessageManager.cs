using UnityEngine;
using System;
using System.Runtime.InteropServices;

/// <summary>
/// Helper to send messages to React Native.
/// This should be attached to a GameObject that persists or is authoritative in the scene.
/// </summary>
public class UnityMessageManager : MonoBehaviour
{
    public static UnityMessageManager Instance { get; private set; }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            // DontDestroyOnLoad(gameObject); // Optional: keep it alive across scenes
        }
        else
        {
            Destroy(gameObject);
        }
    }

    /// <summary>
    /// Sends a message to React Native.
    /// Uses the standard UnitySendMessage or a direct bridge reference depending on the plugin used.
    /// </summary>
    /// <param name="message">The string message to send</param>
    public void SendMessageToRN(string message)
    {
        try
        {
            // This is the standard way for @azesmway/react-native-unity to receive messages
            // The object name in Unity that receives messages from RN is commonly "UnityMessageManager" 
            // but sending TO RN is usually done via a specific plugin call.
            // For @azesmway/react-native-unity, we usually use:
            // NativeAPI.sendMessageToMobileApp(message); 
            // OR checks for the specific implementation.
            
            // Assuming the project uses a standard bridge wrapper:
            // Note: If you are using a specific library, the method might differ.
            // For now, we use a generic placeholder that logs, and you might need 
            // to replace this with the specific NativeAPI call if it exists in your plugins.
            
            // Example for common bridges:
            // UnityMessageManager.SendMessageToMobileApp(message);
            
            // Common pattern for Unity -> RN in many plugins is just a simple Android Java call or iOS Native call
            // packaged in a wrapper.
            
            Debug.Log($"[UnityMessageManager] Sending to RN: {message}");
            
            // For @azesmway/react-native-unity specifically:
            UnityMessageManagerNativeAPI.SendMessageToRN(message);
        }
        catch (Exception e)
        {
            Debug.LogError($"[UnityMessageManager] Error sending message: {e.Message}");
        }
    }
}

// Wrapper for the Native plugin calls
public static class UnityMessageManagerNativeAPI 
{
#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")]
    public static extern void sendMessageToMobileApp(string message);
#endif

    public static void SendMessageToRN(string message)
    {
        if (Application.isEditor)
        {
            Debug.Log($"[Mock Send to RN] {message}");
            return;
        }

#if UNITY_ANDROID
        try
        {
            using (AndroidJavaClass jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
            {
                jc.CallStatic("sendMessageToMobileApp", message);
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"Android Send Failed: {e.Message}");
        }
#elif UNITY_IOS
        sendMessageToMobileApp(message);
#endif
    }
}
