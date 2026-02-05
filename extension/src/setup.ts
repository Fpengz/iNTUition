// extension/src/setup.ts

async function requestPermissions() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        // Immediately stop the tracks after granting permission
        stream.getTracks().forEach(track => track.stop());
        
        const successMsg = document.getElementById('success-msg');
        const grantBtn = document.getElementById('grant-btn');
        
        if (successMsg && grantBtn) {
            successMsg.style.display = 'block';
            grantBtn.style.display = 'none';
        }
        
        console.log("Permissions granted and stream stopped.");
    } catch (error) {
        console.error("Failed to get permissions:", error);
        alert("Permission denied. Aura needs these permissions to function correctly.");
    }
}

document.getElementById('grant-btn')?.addEventListener('click', requestPermissions);
