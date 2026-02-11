using UnityEngine;
using System;

/// <summary>
/// Main bridge between React Native and Unity.
/// Receives messages from React Native and dispatches to other components.
/// Attach this to a GameObject named "ARManager" in the scene.
/// </summary>
public class ARManager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private CharacterPlacer characterPlacer;
    [SerializeField] private GameObject[] characterPrefabs;
    
    private string currentCharacterId;
    private string currentAudioUrl;
    
    private void Awake()
    {
        // Ensure this object persists if needed
        // DontDestroyOnLoad(gameObject);
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
            
            // Find and set the appropriate character prefab
            GameObject prefab = FindCharacterPrefab(data.characterId);
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
    /// Find character prefab by ID
    /// </summary>
    private GameObject FindCharacterPrefab(string characterId)
    {
        if (characterPrefabs == null || characterPrefabs.Length == 0)
        {
            Debug.LogWarning("ARManager: No character prefabs configured, using first available");
            return characterPrefabs != null && characterPrefabs.Length > 0 ? characterPrefabs[0] : null;
        }
        
        // Find prefab by name matching characterId
        foreach (GameObject prefab in characterPrefabs)
        {
            if (prefab != null && prefab.name.ToLower().Contains(characterId.ToLower()))
            {
                return prefab;
            }
        }
        
        // Return first prefab as fallback
        Debug.LogWarning($"ARManager: No prefab found for {characterId}, using default");
        return characterPrefabs[0];
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
        Debug.Log($"[Unity->RN] {message}");
        if (UnityMessageManager.Instance != null)
        {
            UnityMessageManager.Instance.SendMessageToRN(message);
        }
        else
        {
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
