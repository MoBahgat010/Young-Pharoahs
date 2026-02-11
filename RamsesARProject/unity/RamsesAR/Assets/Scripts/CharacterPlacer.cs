using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using System.Collections.Generic;

/// <summary>
/// Handles AR plane detection and character placement.
/// Falls back to placing in front of camera if no planes detected.
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
    [SerializeField] private float fallbackDistance = 2f; // meters in front of camera
    [Tooltip("Model correction rotation. X=-90 stands up Z-up models. Y adjusts facing direction (try 0, 90, 180, -90 if model faces wrong way). Z=roll.")]
    [SerializeField] private Vector3 prefabRotationOffset = new Vector3(-90f, 0f, 0f);
    
    private List<ARRaycastHit> hits = new List<ARRaycastHit>();
    private GameObject placedCharacter;
    private bool isPlacementValid = false;
    private Pose placementPose;
    
    private bool hasLoggedReady = false;
    private float logTimer = 0f;
    private float timeSinceStart = 0f;

    private void Start()
    {
        Debug.Log("CharacterPlacer: Start() called");
        
        // Log subsystem info
        if (planeManager != null)
        {
            var subsystem = planeManager.subsystem;
            Debug.Log($"CharacterPlacer: PlaneManager subsystem={(subsystem != null ? "EXISTS" : "NULL")}, running={(subsystem != null && subsystem.running)}");
        }
    }

    private void Update()
    {
        timeSinceStart += Time.deltaTime;
        
        if (raycastManager == null)
        {
            if (!hasLoggedReady)
            {
                Debug.LogError("CharacterPlacer: raycastManager is NULL!");
                hasLoggedReady = true;
            }
            return;
        }
        
        // Periodic status log every 3 seconds
        logTimer += Time.deltaTime;
        if (logTimer > 3f)
        {
            logTimer = 0f;
            
            // AR Session diagnostics
            var sessionState = ARSession.state;
            int planeCount = planeManager != null ? planeManager.trackables.count : -1;
            string detectionMode = planeManager != null ? planeManager.currentDetectionMode.ToString() : "N/A";
            bool pmEnabled = planeManager != null && planeManager.enabled;
            bool rmEnabled = raycastManager != null && raycastManager.enabled;
            
            // Subsystem diagnostics
            string subsystemInfo = "N/A";
            if (planeManager != null)
            {
                var sub = planeManager.subsystem;
                subsystemInfo = sub != null ? $"running={sub.running}" : "NULL";
            }
            
            Debug.Log($"CharacterPlacer Status: prefab={(characterPrefab != null ? characterPrefab.name : "NULL")}, placementValid={isPlacementValid}, placed={placedCharacter != null}, time={timeSinceStart:F0}s");
            Debug.Log($"AR Diagnostics: SessionState={sessionState}, PlaneCount={planeCount}, DetectionMode={detectionMode}, PM.enabled={pmEnabled}, RM.enabled={rmEnabled}, Subsystem={subsystemInfo}");
            
            // Try all trackable types for raycast
            Vector2 screenCenter = new Vector2(Screen.width / 2f, Screen.height / 2f);
            bool hitsAll = raycastManager.Raycast(screenCenter, hits, TrackableType.All);
            bool hitsPlane = raycastManager.Raycast(screenCenter, hits, TrackableType.PlaneWithinPolygon);
            bool hitsPoint = raycastManager.Raycast(screenCenter, hits, TrackableType.FeaturePoint);
            Debug.Log($"Raycast test: All={hitsAll}, Plane={hitsPlane}, FeaturePoint={hitsPoint}");
        }
        
        UpdatePlacementIndicator();
        HandleTouchInput();
    }
    
    private void UpdatePlacementIndicator()
    {
        Vector2 screenCenter = new Vector2(Screen.width / 2f, Screen.height / 2f);
        
        // Try plane raycast first, then feature points
        if (raycastManager.Raycast(screenCenter, hits, TrackableType.PlaneWithinPolygon))
        {
            if (!isPlacementValid)
                Debug.Log("CharacterPlacer: Plane detected! Tap to place character.");
            isPlacementValid = true;
            placementPose = hits[0].pose;
        }
        else if (raycastManager.Raycast(screenCenter, hits, TrackableType.FeaturePoint))
        {
            if (!isPlacementValid)
                Debug.Log("CharacterPlacer: Feature point detected! Tap to place character.");
            isPlacementValid = true;
            placementPose = hits[0].pose;
        }
        else
        {
            isPlacementValid = false;
        }
        
        if (placementIndicator != null)
        {
            placementIndicator.SetActive(isPlacementValid && placedCharacter == null);
            if (isPlacementValid)
            {
                placementIndicator.transform.position = placementPose.position;
                placementIndicator.transform.rotation = placementPose.rotation;
            }
        }
    }
    
    private void HandleTouchInput()
    {
        if (Input.touchCount == 0) return;
        
        Touch touch = Input.GetTouch(0);
        if (touch.phase != TouchPhase.Began) return;
        if (placedCharacter != null) return;
        if (characterPrefab == null)
        {
            Debug.LogError("CharacterPlacer: No prefab! Can't place.");
            return;
        }
        
        Debug.Log($"CharacterPlacer: Touch at {touch.position}. PlacementValid={isPlacementValid}");
        
        if (isPlacementValid)
        {
            // Try raycast from touch position
            if (raycastManager.Raycast(touch.position, hits, TrackableType.PlaneWithinPolygon | TrackableType.FeaturePoint))
            {
                placementPose = hits[0].pose;
            }
            PlaceCharacter();
        }
        else
        {
            // FALLBACK: Place in front of camera when no planes/features detected
            Debug.Log("CharacterPlacer: No plane detected — using FALLBACK placement in front of camera");
            PlaceInFrontOfCamera();
        }
    }
    
    private void PlaceInFrontOfCamera()
    {
        Camera cam = Camera.main;
        if (cam == null)
        {
            Debug.LogError("CharacterPlacer: Camera.main is null!");
            return;
        }
        
        // Place character 2m in front of camera, at camera height minus 1m (roughly floor level)
        Vector3 camForward = cam.transform.forward;
        camForward.y = 0; // Keep horizontal
        camForward.Normalize();
        
        Vector3 position = cam.transform.position + camForward * fallbackDistance;
        position.y = cam.transform.position.y - 1.0f; // Approximate floor
        
        Quaternion rotation = Quaternion.LookRotation(-camForward, Vector3.up);
        
        placementPose = new Pose(position, rotation);
        PlaceCharacter();
    }
    
    private void PlaceCharacter()
    {
        Debug.Log($"CharacterPlacer: PlaceCharacter() at {placementPose.position}");
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
        
        Debug.Log($"CharacterPlacer: Character instantiated! Scale={characterScale}, Pos={placedCharacter.transform.position}, Rot={placedCharacter.transform.rotation.eulerAngles}, RotOffset={prefabRotationOffset}");
        
        SetPlanesVisible(false);
        SendMessageToReactNative("character_placed");
    }
    
    public void SetCharacterPrefab(GameObject prefab)
    {
        characterPrefab = prefab;
        Debug.Log($"CharacterPlacer: Prefab set to {(prefab != null ? prefab.name : "NULL")}");
    }
    
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
        if (planeManager.planePrefab != null)
            planeManager.planePrefab.gameObject.SetActive(visible);
    }
    
    private void SendMessageToReactNative(string message)
    {
        Debug.Log($"[Unity->RN] {message}");
    }
}
