using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;

/// <summary>
/// Handles audio playback for the AR character.
/// Attach this to the character prefab.
/// </summary>
public class AudioController : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private AudioSource audioSource;
    
    [Header("Settings")]
    [SerializeField] private bool playOnStart = false;
    [SerializeField] private float volume = 1f;
    
    /// <summary>
    /// Callback invoked when audio playback finishes.
    /// </summary>
    public Action onAudioComplete;
    
    private string currentAudioUrl;
    private bool isLoading = false;
    private AudioClip hardcodedClip;
    
    private void Start()
    {
        if (audioSource == null)
        {
            audioSource = GetComponent<AudioSource>();
            if (audioSource == null)
            {
                audioSource = gameObject.AddComponent<AudioSource>();
            }
        }
        
        audioSource.volume = volume;
        audioSource.spatialBlend = 0f; // 2D audio — narration plays at full volume regardless of distance
        audioSource.playOnAwake = false;
        
        // Load hardcoded narration clip from Resources
        if (hardcodedClip == null)
        {
            hardcodedClip = Resources.Load<AudioClip>("Audio/response_audio");
            if (hardcodedClip != null)
                Debug.Log($"AudioController: Loaded hardcoded clip ({hardcodedClip.length:F1}s)");
            else
                Debug.LogWarning("AudioController: No hardcoded clip at Resources/Audio/response_audio");
        }
        
        if (playOnStart)
        {
            PlayAudio();
        }
    }
    
    /// <summary>
    /// Set the audio URL (called from ARManager via React Native)
    /// </summary>
    public void SetAudioUrl(string url)
    {
        currentAudioUrl = url;
        Debug.Log($"AudioController: Audio URL set to {url}");
    }
    
    /// <summary>
    /// Play the loaded audio
    /// </summary>
    public void PlayAudio()
    {
        // Ensure audio source is ready (handles AddComponent at runtime)
        if (audioSource == null)
        {
            audioSource = GetComponent<AudioSource>();
            if (audioSource == null)
                audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.volume = 1f;
            audioSource.spatialBlend = 0f;
            audioSource.playOnAwake = false;
        }
        
        // Lazy-load hardcoded clip if needed
        if (hardcodedClip == null)
            hardcodedClip = Resources.Load<AudioClip>("Audio/response_audio");
        
        // Priority: dynamic URL/file > hardcoded clip > already-assigned clip
        // This ensures TTS audio from chat takes precedence over the default narration
        if (!string.IsNullOrEmpty(currentAudioUrl))
        {
            Debug.Log($"AudioController: Playing dynamic audio from {currentAudioUrl}");
            StartCoroutine(LoadAndPlayAudio(currentAudioUrl));
        }
        else if (hardcodedClip != null)
        {
            audioSource.clip = hardcodedClip;
            audioSource.Play();
            Debug.Log("AudioController: Playing hardcoded narration clip");
            StartCoroutine(WaitForAudioComplete());
        }
        else if (audioSource.clip != null)
        {
            audioSource.Play();
            Debug.Log("AudioController: Playing assigned clip");
            StartCoroutine(WaitForAudioComplete());
        }
        else
        {
            Debug.LogWarning("AudioController: No audio clip or URL to play");
        }
    }
    
    /// <summary>
    /// Load audio from URL and play it
    /// </summary>
    private IEnumerator LoadAndPlayAudio(string url)
    {
        if (isLoading) yield break;
        isLoading = true;
        
        // Determine audio type from extension
        AudioType audioType = AudioType.MPEG;
        if (url.Contains(".wav")) audioType = AudioType.WAV;
        else if (url.Contains(".ogg")) audioType = AudioType.OGGVORBIS;
        
        bool isLocalFile = url.StartsWith("file://") || url.StartsWith("/");
        Debug.Log($"AudioController: Loading {(isLocalFile ? "local" : "remote")} audio from {url} (type={audioType})");
        
        using (UnityWebRequest request = UnityWebRequestMultimedia.GetAudioClip(url, audioType))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                AudioClip clip = DownloadHandlerAudioClip.GetContent(request);
                audioSource.clip = clip;
                audioSource.Play();
                Debug.Log("AudioController: Audio loaded and playing");
                
                // Notify when audio completes
                StartCoroutine(WaitForAudioComplete());
            }
            else
            {
                Debug.LogError($"AudioController: Failed to load audio - {request.error}");
            }
        }
        
        isLoading = false;
    }
    
    private IEnumerator WaitForAudioComplete()
    {
        while (audioSource.isPlaying)
        {
            yield return null;
        }
        
        Debug.Log("AudioController: Audio playback complete");
        onAudioComplete?.Invoke();
    }
    
    /// <summary>
    /// Stop audio playback
    /// </summary>
    public void StopAudio()
    {
        if (audioSource != null && audioSource.isPlaying)
        {
            audioSource.Stop();
        }
    }
    
    /// <summary>
    /// Set audio clip directly (for local audio files)
    /// </summary>
    public void SetAudioClip(AudioClip clip)
    {
        if (audioSource != null)
        {
            audioSource.clip = clip;
        }
    }
}
