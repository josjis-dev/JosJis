// =====================================
// JOSJIS SHARED COMPONENTS
// Version 1.0
// =====================================


// =====================================
// JOSJIS CONFIGURATION
// =====================================

const JJS_CONTRACT =
    "0x52C8Ff13ada1431376b3E77E8219b644805122dF";


// =====================================
// 1. CONTRACT ADDRESS COMPONENT
// =====================================

function renderContract(targetId) {

    const target = document.getElementById(targetId);

    if (!target) return;

    target.innerHTML = `
        <div class="jjs-contract-component">

            <span class="jjs-contract-address">
                ${JJS_CONTRACT}
            </span>

            <button
                type="button"
                onclick="copyJJSContract()">
                Copy Address
            </button>

        </div>
    `;
}


async function copyJJSContract() {

    try {

        await navigator.clipboard.writeText(JJS_CONTRACT);

        showJJSAlert(
            "Contract address copied successfully!",
            "success"
        );

    } catch (error) {

        showJJSAlert(
            "Unable to copy contract address.",
            "error"
        );

    }
}


// =====================================
// 2. ALERT COMPONENT
// =====================================

function showJJSAlert(message, type = "info") {

    let alertBox = document.getElementById("jjsAlert");

    if (!alertBox) {

        alertBox = document.createElement("div");

        alertBox.id = "jjsAlert";
        alertBox.className = "jjs-alert";

        document.body.appendChild(alertBox);

    }

    alertBox.textContent = message;
    alertBox.className = "jjs-alert " + type;

    alertBox.style.display = "block";

    clearTimeout(alertBox.hideTimer);

    alertBox.hideTimer = setTimeout(() => {

        alertBox.style.display = "none";

    }, 4000);

}


// =====================================
// 3. MODAL COMPONENT
// =====================================

function showJJSModal(title, message) {

    let modal = document.getElementById("jjsModal");

    if (!modal) {

        modal = document.createElement("div");

        modal.id = "jjsModal";
        modal.className = "jjs-modal";

        document.body.appendChild(modal);

    }

    modal.innerHTML = `
        <div class="jjs-modal-content">

            <h2>${escapeJJSHTML(title)}</h2>

            <p>${escapeJJSHTML(message)}</p>

            <button
                type="button"
                onclick="closeJJSModal()">
                Close
            </button>

        </div>
    `;

    modal.style.display = "flex";

}


function closeJJSModal() {

    const modal = document.getElementById("jjsModal");

    if (modal) {
        modal.style.display = "none";
    }

}


// =====================================
// 4. INFORMATION CARD COMPONENT
// =====================================

function renderJJSInfoCard(
    targetId,
    title,
    value,
    description = ""
) {

    const target = document.getElementById(targetId);

    if (!target) return;

    target.innerHTML = `
        <div class="jjs-info-card">

            <h3>${escapeJJSHTML(title)}</h3>

            <div class="jjs-info-value">
                ${escapeJJSHTML(value)}
            </div>

            <p>
                ${escapeJJSHTML(description)}
            </p>

        </div>
    `;

}


// =====================================
// HTML ESCAPE HELPER
// =====================================

function escapeJJSHTML(value) {

    return String(value).replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );

}


// =====================================
// JOSJIS COMPONENTS READY
// =====================================

console.log("JosJis Components v1.0 loaded.");
