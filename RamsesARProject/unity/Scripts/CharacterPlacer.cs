using UnityEngine;
using UnityEngine.UI;
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
    [SerializeField] private float characterScale = 1.25f;
    [Tooltip("Model correction rotation. X=-90 stands up Z-up models. Y adjusts facing direction (try 0, 90, 180, -90 if model faces wrong way). Z=roll.")]
    [SerializeField] private Vector3 prefabRotationOffset = new Vector3(-90f, 0f, 0f);
    
    private List<ARRaycastHit> hits = new List<ARRaycastHit>();
    private GameObject placedCharacter;
    private bool isPlacementValid = false;
    private Pose placementPose;
    
    // Instruction UI (created programmatically)
    private Canvas instructionCanvas;
    private Text instructionText;
    private Text scanningText;
    
    private void Start()
    {
        CreateInstructionUI();
    }
    
    /// <summary>
    /// Creates the on-screen instruction UI programmatically.
    /// </summary>
    private void CreateInstructionUI()
    {
        GameObject canvasObj = new GameObject("InstructionCanvas");
        instructionCanvas = canvasObj.AddComponent<Canvas>();
        instructionCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
        instructionCanvas.sortingOrder = 100;
        var scaler = canvasObj.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject scanObj = new GameObject("ScanningText");
        scanObj.transform.SetParent(canvasObj.transform, false);
        scanningText = scanObj.AddComponent<Text>();
        scanningText.text = "Point your camera at a flat surface\u2026";
        scanningText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        if (scanningText.font == null) scanningText.font = Font.CreateDynamicFontFromOSFont("Arial", 32);
        scanningText.fontSize = 32;
        scanningText.color = new Color(1f, 1f, 1f, 0.85f);
        scanningText.alignment = TextAnchor.MiddleCenter;
        var scanRect = scanObj.GetComponent<RectTransform>();
        scanRect.anchorMin = new Vector2(0.1f, 0.42f);
        scanRect.anchorMax = new Vector2(0.9f, 0.52f);
        scanRect.offsetMin = Vector2.zero;
        scanRect.offsetMax = Vector2.zero;

        GameObject textObj = new GameObject("TapToStartText");
        textObj.transform.SetParent(canvasObj.transform, false);
        instructionText = textObj.AddComponent<Text>();
        instructionText.text = "TAP TO START";
        instructionText.font = scanningText.font;
        instructionText.fontSize = 54;
        instructionText.fontStyle = FontStyle.Bold;
        instructionText.color = new Color(0.957f, 0.753f, 0.145f, 1f);
        instructionText.alignment = TextAnchor.MiddleCenter;
        var outline = textObj.AddComponent<Outline>();
        outline.effectColor = new Color(0f, 0f, 0f, 0.75f);
        outline.effectDistance = new Vector2(2, -2);
        var textRect = textObj.GetComponent<RectTransform>();
        textRect.anchorMin = new Vector2(0.1f, 0.4f);
        textRect.anchorMax = new Vector2(0.9f, 0.6f);
        textRect.offsetMin = Vector2.zero;
        textRect.offsetMax = Vector2.zero;

        scanningText.gameObject.SetActive(true);
        instructionText.gameObject.SetActive(false);
    }
    
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
        
        // Update instruction overlay
        if (placedCharacter == null)
        {
            if (scanningText != null) scanningText.gameObject.SetActive(!isPlacementValid);
            if (instructionText != null) instructionText.gameObject.SetActive(isPlacementValid);
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
        
        placedCharacter = Instantiate(characterPrefab, placementPose.position, Quaternion.identity);
        placedCharacter.transform.localScale = Vector3.one * characterScale;
        
        // Model correction: stands the model upright and adjusts its facing direction
        // This is applied in the model's LOCAL space before the face-camera rotation
        Quaternion modelCorrection = Quaternion.Euler(prefabRotationOffset);
        
        // Face-camera rotation: makes the model face toward the camera
        Quaternion faceCamera = Quaternion.identity;
        if (Camera.main != null)
        {
            Vector3 dirToCamera = Camera.main.transform.position - placedCharacter.transform.position;
            dirToCamera.y = 0; // Only horizontal direction
            if (dirToCamera.sqrMagnitude > 0.001f)
            {
                faceCamera = Quaternion.LookRotation(dirToCamera.normalized, Vector3.up);
            }
        }
        
        // Combined: face camera first (world), then apply model correction (local)
        // If model faces wrong direction, adjust prefabRotationOffset.Y in inspector
        // (try 0, 90, 180, or -90)
        placedCharacter.transform.rotation = faceCamera * modelCorrection;
        
        // Optionally hide planes after placement
        SetPlanesVisible(false);
        
        // Notify React Native that character was placed
        SendMessageToReactNative("character_placed");
        
        // Hide instruction UI
        if (instructionCanvas != null)
            instructionCanvas.gameObject.SetActive(false);
        
        // Play narration audio and auto-close when done
        AudioController audioController = placedCharacter.GetComponent<AudioController>();
        if (audioController == null)
            audioController = placedCharacter.AddComponent<AudioController>();
        audioController.onAudioComplete = () =>
        {
            Debug.Log("CharacterPlacer: Narration finished — notifying RN to close");
            SendMessageToReactNative("audio_complete");
        };
        audioController.PlayAudio();
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
}
