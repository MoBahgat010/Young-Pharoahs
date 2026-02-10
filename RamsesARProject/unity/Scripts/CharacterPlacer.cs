using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using System.Collections.Generic;

/// <summary>
/// Handles AR plane detection and character placement.
/// Attach this to an empty GameObject in the scene.
/// </summary>
public class CharacterPlacer : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private ARRaycastManager raycastManager;
    [SerializeField] private ARPlaneManager planeManager;
    [SerializeField] private GameObject placementIndicator;
    [SerializeField] private GameObject characterPrefab;
    
    [Header("Settings")]
    [SerializeField] private float characterScale = 1f;
    
    private List<ARRaycastHit> hits = new List<ARRaycastHit>();
    private GameObject placedCharacter;
    private bool isPlacementValid = false;
    private Pose placementPose;
    
    private void Update()
    {
        UpdatePlacementIndicator();
        HandleTouchInput();
    }
    
    /// <summary>
    /// Raycast from screen center to detect AR planes
    /// </summary>
    private void UpdatePlacementIndicator()
    {
        Vector2 screenCenter = new Vector2(Screen.width / 2f, Screen.height / 2f);
        
        if (raycastManager.Raycast(screenCenter, hits, TrackableType.PlaneWithinPolygon))
        {
            isPlacementValid = true;
            placementPose = hits[0].pose;
            
            // Update indicator position and rotation
            if (placementIndicator != null)
            {
                placementIndicator.SetActive(placedCharacter == null);
                placementIndicator.transform.position = placementPose.position;
                placementIndicator.transform.rotation = placementPose.rotation;
            }
        }
        else
        {
            isPlacementValid = false;
            if (placementIndicator != null)
            {
                placementIndicator.SetActive(false);
            }
        }
    }
    
    /// <summary>
    /// Handle touch to place character
    /// </summary>
    private void HandleTouchInput()
    {
        if (Input.touchCount > 0 && Input.touches[0].phase == TouchPhase.Began)
        {
            if (isPlacementValid && placedCharacter == null)
            {
                PlaceCharacter();
            }
        }
    }
    
    /// <summary>
    /// Instantiate the character at the detected plane
    /// </summary>
    private void PlaceCharacter()
    {
        if (characterPrefab == null)
        {
            Debug.LogError("CharacterPlacer: No character prefab assigned!");
            return;
        }
        
        placedCharacter = Instantiate(characterPrefab, placementPose.position, placementPose.rotation);
        placedCharacter.transform.localScale = Vector3.one * characterScale;
        
        // Face the camera
        Vector3 lookAtPos = Camera.main.transform.position;
        lookAtPos.y = placedCharacter.transform.position.y;
        placedCharacter.transform.LookAt(lookAtPos);
        
        // Optionally hide planes after placement
        SetPlanesVisible(false);
        
        // Notify React Native that character was placed
        SendMessageToReactNative("character_placed");
        
        // Get audio controller and trigger playback
        AudioController audioController = placedCharacter.GetComponent<AudioController>();
        if (audioController != null)
        {
            audioController.PlayAudio();
        }
    }
    
    /// <summary>
    /// Set a new character prefab (called from React Native)
    /// </summary>
    public void SetCharacterPrefab(GameObject prefab)
    {
        characterPrefab = prefab;
    }
    
    /// <summary>
    /// Reset the placed character
    /// </summary>
    public void ResetCharacter()
    {
        if (placedCharacter != null)
        {
            Destroy(placedCharacter);
            placedCharacter = null;
        }
        SetPlanesVisible(true);
    }
    
    private void SetPlanesVisible(bool visible)
    {
        if (planeManager == null) return;
        
        foreach (ARPlane plane in planeManager.trackables)
        {
            plane.gameObject.SetActive(visible);
        }
        planeManager.planePrefab.gameObject.SetActive(visible);
    }
    
    private void SendMessageToReactNative(string message)
    {
        // Unity-to-ReactNative messaging
        // This requires the bridge plugin to be properly set up
        Debug.Log($"[Unity->RN] {message}");
    }
}
