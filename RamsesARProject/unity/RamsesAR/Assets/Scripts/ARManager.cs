using UnityEngine;
using System;
using System.Collections;

/// <summary>
/// Main bridge between React Native and Unity.
/// Receives messages from React Native and dispatches to other components.
/// Attach this to a GameObject named "ARManager" in the scene.
/// </summary>
public class ARManager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private CharacterPlacer characterPlacer;
    // [SerializeField] private GameObject[] characterPrefabs; // Removed in favor of Resources.Load
    
    private string currentCharacterId;
    private string currentAudioUrl;
    
    private void Start()
    {
        // Auto-find CharacterPlacer if not assigned in Inspector
        if (characterPlacer == null)
        {
            characterPlacer = GetComponent<CharacterPlacer>();
            if (characterPlacer == null)
                characterPlacer = FindAnyObjectByType<CharacterPlacer>();
            if (characterPlacer == null)
                Debug.LogError("ARManager: Could not find CharacterPlacer in scene!");
            else
                Debug.Log("ARManager: Auto-found CharacterPlacer");
        }
        
        // Auto-load a default character so placement works immediately
        LoadDefaultCharacter();
        
        // Also try to notify React Native that Unity is ready
        StartCoroutine(SendReadyMessageDelayed());
    }

    private void LoadDefaultCharacter()
    {
        string defaultId = "cat_pharaoh__king";
        Debug.Log($"ARManager: Auto-loading default character: {defaultId}");
        
        GameObject prefab = LoadCharacterPrefab(defaultId);
        if (prefab != null && characterPlacer != null)
        {
            characterPlacer.SetCharacterPrefab(prefab);
            Debug.Log("ARManager: Default character prefab set on CharacterPlacer");
        }
        else
        {
            Debug.LogError($"ARManager: Failed to auto-load. prefab={prefab}, characterPlacer={characterPlacer}");
        }
    }

    private IEnumerator SendReadyMessageDelayed()
    {
        yield return new WaitForSeconds(1.0f);
        SendMessageToReactNative("unity_ready");
    }

    /// <summary>
    /// Called from React Native to load a character with audio.
    /// Message format: JSON string with characterId and audioUrl
    /// </summary>
    public void LoadCharacter(string jsonData)
    {
        try
        {
            CharacterData data = JsonUtility.FromJson<CharacterData>(jsonData);
            currentCharacterId = data.characterId;
            currentAudioUrl = data.audioUrl;
            
            Debug.Log($"ARManager: Loading character {data.characterId} with audio {data.audioUrl}");
            
            // Load character prefab from Resources
            GameObject prefab = LoadCharacterPrefab(data.characterId);
            
            if (prefab != null && characterPlacer != null)
            {
                // Configure the prefab's AudioController with the URL
                AudioController audioController = prefab.GetComponent<AudioController>();
                if (audioController != null)
                {
                    audioController.SetAudioUrl(data.audioUrl);
                }
                
                characterPlacer.SetCharacterPrefab(prefab);
            }
            
            SendMessageToReactNative("character_loaded");
        }
        catch (Exception e)
        {
            Debug.LogError($"ARManager: Failed to parse character data - {e.Message}");
            SendMessageToReactNative($"error:{e.Message}");
        }
    }
    
    /// <summary>
    /// Load character prefab from Resources/Characters/{id}
    /// </summary>
    private GameObject LoadCharacterPrefab(string characterId)
    {
        string path = $"Characters/{characterId}";
        GameObject prefab = Resources.Load<GameObject>(path);

        if (prefab == null)
        {
            Debug.LogError($"ARManager: Could not find prefab at Resources/{path}");
            
            // Fallback to the only available character
            prefab = Resources.Load<GameObject>("Characters/cat_pharaoh__king");
        }

        if (prefab == null)
        {
            Debug.LogError("ARManager: Fatal - No matching character prefab found.");
        }
        
        return prefab;
    }
    
    /// <summary>
    /// Reset the AR scene
    /// </summary>
    public void ResetScene(string unused)
    {
        if (characterPlacer != null)
        {
            characterPlacer.ResetCharacter();
        }
        SendMessageToReactNative("scene_reset");
    }
    
    /// <summary>
    /// Send message back to React Native
    /// </summary>
    private void SendMessageToReactNative(string message)
    {
        // Use our new manager or fallback
        if (UnityMessageManager.Instance != null)
        {
            UnityMessageManager.Instance.SendMessageToRN(message);
        }
        else
        {
            Debug.LogWarning("UnityMessageManager instance not found, falling back to direct call");
            UnityMessageManagerNativeAPI.SendMessageToRN(message);
        }
    }
    
    [Serializable]
    private class CharacterData
    {
        public string characterId;
        public string audioUrl;
    }
}
