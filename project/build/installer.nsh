; build/installer.nsh

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

; --- VARIABLES GLOBALES ---
Var hCtl_RemoveData_Checkbox
Var RemoveData_State

; --- PAGE PERSONNALISÉE ---
Function un.ShowUninstallOption
  !insertmacro MUI_HEADER_TEXT "Options de nettoyage" "Choisissez comment désinstaller Mcreahub."
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  
  ; Case décochée par défaut pour SAUVEGARDER les données (éviter le blocage)
  ${NSD_CreateCheckbox} 0 0 100% 10u "Supprimer également les données utilisateurs (Projets, Configs, Cache)"
  Pop $hCtl_RemoveData_Checkbox
  
  ; 0 = Décoché (Les données seront conservées/enregistrées)
  ${NSD_SetState} $hCtl_RemoveData_Checkbox 0
  
  ${NSD_CreateLabel} 12u 15u 90% 30u "Si vous cochez cette case, le dossier %APPDATA%\Mcreahub sera supprimé.$\nATTENTION : Laissez décoché pour conserver vos données et éviter un redémarrage."
  Pop $0
  
  nsDialogs::Show
FunctionEnd

Function un.StoreUninstallOption
  ${NSD_GetState} $hCtl_RemoveData_Checkbox $RemoveData_State
FunctionEnd

UninstPage custom un.ShowUninstallOption un.StoreUninstallOption

; --- MACRO DE DÉSINSTALLATION ---
!macro customUnInstall

  DetailPrint "Arrêt des processus..."

  ; 1. TENTATIVE DE FERMETURE DOUCE
  !if "${BUILD_TARGET}" == "dev"
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --cleanup-token --is-dev'
  !else
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --cleanup-token'
  !endif

  ; 2. ARRÊT FORCÉ (CRITIQUE pour libérer AppData)
  ; On tue l'executable principal et les processus enfants potentiels
  nsExec::Exec 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  nsExec::Exec 'taskkill /F /IM "mcreahub.exe" /T'
  
  ; Pause de 2 secondes pour laisser Windows libérer les verrous de fichiers
  Sleep 2000

  ; 3. NETTOYAGE DES DONNÉES UTILISATEUR (SI DEMANDÉ)
  ${If} $RemoveData_State == 1
    
    DetailPrint "Suppression des données utilisateur..."

    SetShellVarContext current
    
    ; /REBOOTOK permet de continuer même si un fichier est bloqué (il sera supprimé au prochain reboot)
    RMDir /r /REBOOTOK "$APPDATA\Mcreahub"
    RMDir /r /REBOOTOK "$APPDATA\mcreahub"
    RMDir /r /REBOOTOK "$APPDATA\${PRODUCT_FILENAME}"
    
    RMDir /r /REBOOTOK "$LOCALAPPDATA\Mcreahub"

    ; Sécurité supplémentaire avec chemin absolu
    ExpandEnvStrings $0 "%APPDATA%"
    RMDir /r /REBOOTOK "$0\Mcreahub"

  ${EndIf}

  ; 4. NETTOYAGE SYSTÈME
  SetShellVarContext all
  Delete "$SMPROGRAMS\${PRODUCT_FILENAME}.lnk"
  Delete "$DESKTOP\${PRODUCT_FILENAME}.lnk"

  ; 5. SUPPRESSION DU PROGRAMME
  RMDir /r /REBOOTOK "$INSTDIR"

!macroend