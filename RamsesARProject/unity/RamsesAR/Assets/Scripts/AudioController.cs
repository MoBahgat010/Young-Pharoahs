using UnityEngine;
using UnityEngine.Networking;
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
    
    private string currentAudioUrl;
    private bool isLoading = false;
    
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
        audioSource.spatialBlend = 1f; // 3D audio
        audioSource.playOnAwake = false;
        
        if (playOnStart && !string.IsNullOrEmpty(currentAudioUrl))
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
        if (audioSource.clip != null)
        {
            audioSource.Play();
            Debug.Log("AudioController: Playing audio");
        }
        else if (!string.IsNullOrEmpty(currentAudioUrl))
        {
            StartCoroutine(LoadAndPlayAudio(currentAudioUrl));
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
        
        Debug.Log($"AudioController: Loading audio from {url}");
        
        using (UnityWebRequest request = UnityWebRequestMultimedia.GetAudioClip(url, AudioType.MPEG))
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
        // Could notify React Native here
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
