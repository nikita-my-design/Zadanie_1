let savedTheme = null;

// Read the saved theme.
try {
    savedTheme = localStorage.getItem("site-theme");
} catch (error) {
    savedTheme = null;
}

let hasManualTheme = savedTheme === "dark" || savedTheme === "light";

// Apply the theme and update the button.
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    const button = document.getElementById("theme-toggle");

    if (!button) {
        return;
    }

    const isDark = theme === "dark";

    button.setAttribute("aria-pressed", String(isDark));

    if (isDark) {
        button.title = "Zapnúť svetlý režim";
    } else {
        button.title = "Zapnúť tmavý režim";
    }
}

// Use the saved theme or start with light.
if (hasManualTheme) {
    applyTheme(savedTheme);
} else {
    applyTheme("light");
}

// Connect the button when the HTML is ready.
document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("theme-toggle");

    if (!button) {
        return;
    }

    applyTheme(document.documentElement.dataset.theme);
    button.hidden = false;

    button.addEventListener("click", function () {
        let nextTheme = "dark";

        if (document.documentElement.dataset.theme === "dark") {
            nextTheme = "light";
        }

        hasManualTheme = true;
        applyTheme(nextTheme);

        // Save the selected theme.
        try {
            localStorage.setItem("site-theme", nextTheme);
        } catch (error) {
            // The button still works without saving.
        }
    });
});
