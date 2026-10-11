const SEMESTER_START = new Date("2026-09-01");
const SEMESTER_END = new Date("2027-02-14");

// Get the filter buttons and lesson elements.
const buttons = document.querySelectorAll("[data-filter]");
const lessons = document.querySelectorAll("[data-type]");
const slider = document.querySelector(".filter-slider");
const nextLessonText = document.querySelector(".next-lesson-description");
const semesterBar = document.querySelector(".semester-bar-fill");
const semesterPercent = document.querySelector(".semester-percent");
const filterMessage = document.getElementById("schedule-status");
const scheduleTable = document.querySelector(".schedule-scroll-and-radius");

// Run this part only on the schedule page.
if (lessons.length > 0) {
    for (const button of buttons) {

        // Filter lessons when a button is clicked.
        button.addEventListener("click", function () {
            const filter = button.dataset.filter;
            // Update the selected filter.
            for (const filterButton of buttons) {
                const isSelected = filterButton === button;

                filterButton.setAttribute(
                    "aria-pressed",
                    String(isSelected)
                );
            }

            // Move the slider under this button.
            slider.style.left = button.offsetLeft + "px";
            slider.style.width = button.offsetWidth + "px";

            let visibleLessons = 0;

            for (const lesson of lessons) {
                if (filter === "all" || lesson.dataset.type === filter) {
                    lesson.style.visibility = "visible";
                    visibleLessons++;
                } else {
                    lesson.style.visibility = "hidden";
                }
            }

            if (visibleLessons === 0) {
                filterMessage.textContent = "Pre tento filter nie sú žiadne hodiny.";
                scheduleTable.hidden = true;
            } else {
                filterMessage.textContent = "";
                scheduleTable.hidden = false;    
            }
        });
    }

    const now = new Date();

    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Convert the current time to minutes.
    const currentTime = currentHour * 60 + currentMinute;

    let hasCurrentLesson = false;
    let nextLesson = null;

    // Start with no limit for the waiting time.
    let shortestWait = Infinity;

    for (const lesson of lessons) {
        const lessonDay = Number(lesson.dataset.day);
        let daysUntilLesson = lessonDay - currentDay;

        // If this day has passed, use next week.
        if (daysUntilLesson < 0) {
            daysUntilLesson = daysUntilLesson + 7;
        }

        const startText = lesson.dataset.start;
        const endText = lesson.dataset.end;

        // Split the time into hours and minutes.
        const startParts = startText.split(":");
        const startHour = Number(startParts[0]);
        const startMinute = Number(startParts[1]);

        const startTime = startHour * 60 + startMinute;

        // Find the waiting time in minutes.
        let waitMinutes = daysUntilLesson * 24 * 60 + startTime - currentTime;

        // If the lesson has started, use its time next week.
        if (waitMinutes <= 0){
            waitMinutes = waitMinutes + 7 * 24 * 60;
        }

        // Keep the lesson with the shortest wait.
        if (waitMinutes < shortestWait){
            shortestWait = waitMinutes;
            nextLesson = lesson;
        }

        const endParts = endText.split(":");
        const endHour = Number(endParts[0]);
        const endMinute = Number(endParts[1]);

        const endTime = endHour * 60 + endMinute;

        // Highlight the lesson that is running now.
        if (lessonDay === currentDay && currentTime >= startTime && currentTime < endTime){
            lesson.classList.add("current-lesson");
            hasCurrentLesson = true;
        }
    }

    const dayNames = [
        "nedeľa",
        "pondelok",
        "utorok",
        "streda",
        "štvrtok",
        "piatok",
        "sobota"
    ];

    // Show the day and time of the next lesson.
    if (nextLesson !== null) {
        const day = Number(nextLesson.dataset.day);
        const dayName = dayNames[day];
        const start = nextLesson.dataset.start;

        nextLessonText.textContent = "Najbližšia hodina: " + dayName + " o " + start;
    }

    const nextLessonTag = document.querySelector(".next-lesson");

    if (hasCurrentLesson === false && nextLesson !== null) {
        nextLessonTag.style.display = "flex";
    } else {
        nextLessonTag.style.display = "none";
    }

    const statusTag = document.querySelector(".study-current-status");

    if (hasCurrentLesson === false) {
        statusTag.style.display = "flex";
    } else {
        statusTag.style.display = "none";
    }

    // Find how much of the semester has passed.
    const semesterDuration = SEMESTER_END - SEMESTER_START;
    const elapsedTime = now - SEMESTER_START;
    let semesterProgress = elapsedTime / semesterDuration * 100;

    semesterProgress = Math.round(semesterProgress);

    // Keep the progress between 0 and 100.
    if (semesterProgress < 0) {
        semesterProgress = 0;
    }

    if (semesterProgress > 100) {
        semesterProgress = 100;
    }

    semesterBar.style.width = semesterProgress + "%";
    semesterPercent.textContent = semesterProgress + "%";
}


// Start the map after the HTML is ready.
document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("interactive-map");

    // Stop if this page has no map.
    if (!mapElement) {
        return;
    }

    const SCHOOL = {
        name: "FEI STU",
        latitude: 48.151965,
        longitude: 17.072995
    };

    const HOME = {
        name: "Domov",
        latitude: 48.1590,
        longitude: 17.0640
    };

    const STORAGE_KEY = "nikita-map-places";
    const BLUE = "#26A1FF";

    const placeForm = document.getElementById("place-form");
    const placeNameInput = document.getElementById("place-name");
    const addPlaceButton = document.getElementById("add-place-button");
    const placeList = document.getElementById("place-list");
    const deletePlaceButton = document.getElementById("delete-place-button");
    const targetButtons = document.getElementById("target-buttons");
    const schoolButton = document.getElementById("school-button");
    const homeButton = document.getElementById("home-button");
    const emptyMessage = document.getElementById("empty-message");
    const positionMessage = document.getElementById("position-message");
    const distanceValue = document.getElementById("distance-value");
    const distanceDescription = document.getElementById("distance-description");
    const mapMessage = document.getElementById("map-message");
    const storageMessage = document.getElementById("storage-message");
    const resetMapButton = document.getElementById("reset-map-button");

    let map;
    let schoolMarker;
    let homeMarker;
    let temporaryMarker;
    let connectionLine;

    // Store place names and coordinates here.
    let places = [];

    // Store the markers shown on the map here.
    let placeMarkers = [];

    let selectedPoint = null;
    let selectedTarget = SCHOOL;

    // Stop if Leaflet did not load.
    if (typeof L === "undefined") {
        mapMessage.hidden = false;
        mapMessage.textContent =
            "Mapa sa nenačítala. Skontrolujte pripojenie a obnovte stránku.";
        return;
    }

    // Connect the form and buttons to their actions.
    placeForm.addEventListener("submit", addPlace);
    placeList.addEventListener("change", showDistance);
    deletePlaceButton.addEventListener("click", deletePlace);
    resetMapButton.addEventListener("click", showSchoolAndHome);

    // Choose the school as the target.
    schoolButton.addEventListener("click", function () {
        selectTarget(SCHOOL, schoolButton, homeButton);
    });

    // Choose home as the target.
    homeButton.addEventListener("click", function () {
        selectTarget(HOME, homeButton, schoolButton);
    });

    // Create the map and show saved places.
    startMap();
    loadPlaces();
    drawPlaces();

    if (places.length > 0) {
        showDistance();
    }


    // Create the map and add the school and home.
    function startMap() {
        map = L.map("interactive-map", {
            scrollWheelZoom: false,
            zoomControl: true,
            keyboard: false,
            inertia: false,
            zoomAnimation: false,
            fadeAnimation: false,
            markerZoomAnimation: false
        });

        // Load the map images from OpenStreetMap.
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors"
        }).addTo(map);
        // Set the view before reading marker elements.
        showSchoolAndHome();

        schoolMarker = L.marker(
            [SCHOOL.latitude, SCHOOL.longitude],
            {
                icon: createMarkerIcon("school-pin", "S")
            }
        ).addTo(map);

        schoolMarker.getElement().setAttribute(
            "aria-label",
            "Škola — FEI STU"
        );

        schoolMarker.bindPopup(
            createPopup("FEI STU", "Ilkovičova 3, Bratislava")
        );

        schoolMarker.bindTooltip("FEI STU", {
            permanent: true,
            direction: "top",
            className: "map-label"
        });

        homeMarker = L.marker(
            [HOME.latitude, HOME.longitude],
            {
                icon: createMarkerIcon("home-pin", "D")
            }
        ).addTo(map);

        homeMarker.getElement().setAttribute(
            "aria-label",
            "Domov"
        );

        homeMarker.bindPopup(
            createPopup(
                "Domov",
                "Približne: Mlynská dolina, Bratislava"
            )
        );

        homeMarker.bindTooltip("Domov", {
            permanent: true,
            direction: "top",
            className: "map-label"
        });

        resetMapButton.disabled = false;

        // Use the point clicked on the map.
        map.on("click", function (event) {
            selectPoint(event.latlng);
        });

        // Control the map with the keyboard.
        mapElement.addEventListener("keydown", function (event) {
            // Ignore keys used on buttons and markers inside the map.
            if (event.target !== mapElement) {
                return;
            }

            let movement = null;

            if (event.key === "ArrowLeft") {
                movement = [-80, 0];
            } else if (event.key === "ArrowRight") {
                movement = [80, 0];
            } else if (event.key === "ArrowUp") {
                movement = [0, -80];
            } else if (event.key === "ArrowDown") {
                movement = [0, 80];
            }

            if (movement !== null) {
                event.preventDefault();
                map.panBy(movement, { animate: false });
                return;
            }

            if (event.key === "+" || event.key === "=") {
                event.preventDefault();
                map.setZoom(map.getZoom() + 1, { animate: false });
            } else if (event.key === "-") {
                event.preventDefault();
                map.setZoom(map.getZoom() - 1, { animate: false });
            } else if (event.key === "Enter") {
                event.preventDefault();
                selectPoint(map.getCenter());
            }
        });
    }


    // Create a marker icon with a letter or number.
    function createMarkerIcon(className, text) {
        return L.divIcon({
            className: "map-marker",

            // Build the span used inside the marker.
            html:
                "<span class=\"map-pin " +
                className +
                "\">" +
                text +
                "</span>",

            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    }


    // Create the title and text for a popup.
    function createPopup(title, text) {
        const popup = document.createElement("div");
        popup.className = "map-popup";

        const heading = document.createElement("strong");
        heading.textContent = title;

        const paragraph = document.createElement("p");
        paragraph.textContent = text;

        // Put the heading and paragraph inside the popup.
        popup.appendChild(heading);
        popup.appendChild(paragraph);

        return popup;
    }


    // Move the map to show both school and home.
    function showSchoolAndHome(){
        // Adjust the map view to fit these points.
        map.fitBounds(
            [
                [SCHOOL.latitude, SCHOOL.longitude],
                [HOME.latitude, HOME.longitude]
            ],
            {
                padding: [50, 50],
                maxZoom: 15,
                animate: false
            }
        );
    }


    // Show the selected point and enable the form.
    function selectPoint(point) {
        selectedPoint = point;

        // Remove the previous selected point.
        if (temporaryMarker) {
            map.removeLayer(temporaryMarker);
        }

        temporaryMarker = L.circleMarker(point, {
            radius: 8,
            color: BLUE,
            fillColor: BLUE,
            fillOpacity: 0.25
        }).addTo(map);

        placeNameInput.disabled = false;
        addPlaceButton.disabled = false;

        positionMessage.textContent =
            "Bod je vybraný. Napíšte názov miesta.";

        placeNameInput.focus();
    }


    // Add the named place to the list and map.
    function addPlace(event) {
        // Stop the form from reloading the page.
        event.preventDefault();

        // Remove spaces from the start and end of the name.
        const name = placeNameInput.value.trim();

        if (!selectedPoint || name === "") {
            positionMessage.textContent =
                "Najprv kliknite na mapu a napíšte názov miesta.";
            return;
        }

        // Save the name and coordinates in the array.
        places.push({
            name: name,
            latitude: selectedPoint.lat,
            longitude: selectedPoint.lng
        });

        savePlaces();
        drawPlaces();

        // Select the new place, which is last in the array.
        placeList.value = String(places.length - 1);
        showDistance();

        map.removeLayer(temporaryMarker);

        temporaryMarker = null;
        selectedPoint = null;

        placeNameInput.value = "";
        placeNameInput.disabled = true;
        addPlaceButton.disabled = true;

        positionMessage.textContent =
            "Miesto je pridané. Ďalšie pridáte kliknutím na mapu.";

        placeList.focus();
    }


    // Update the list, markers and buttons.
    function drawPlaces() {
        // Clear the old list before building it again.
        placeList.textContent = "";

        // Remove the old markers before drawing the full list.
        for (let i = 0; i < placeMarkers.length; i++) {
            map.removeLayer(placeMarkers[i]);
        }

        // Clear the marker array, not the place data.
        placeMarkers = [];

        // If there are no places, disable the controls.
        if (places.length === 0) {
            emptyMessage.hidden = false;
            placeList.disabled = true;
            targetButtons.disabled = true;
            deletePlaceButton.disabled = true;

            const emptyOption = document.createElement("option");
            emptyOption.textContent = "Zatiaľ nemáte miesto";
            emptyOption.value = "";

            placeList.appendChild(emptyOption);

            return;
        }

        emptyMessage.hidden = true;
        placeList.disabled = false;
        targetButtons.disabled = false;
        deletePlaceButton.disabled = false;

        for (let i = 0; i < places.length; i++) {
            const place = places[i];

            // Create one item for the place list.
            const option = document.createElement("option");

            // Use the array index to find this place later.
            option.value = String(i);
            option.textContent = place.name;

            placeList.appendChild(option);

            const marker = L.marker(
                [place.latitude, place.longitude],
                {
                    icon: createMarkerIcon(
                        "place-pin",

                        // Show marker numbers starting from 1, not 0.
                        String(i + 1)
                    )
                }
            ).addTo(map);

            marker.getElement().setAttribute(
                "aria-label",
                "Vlastné miesto — " + place.name
            );

            marker.bindPopup(
                createPopup(place.name, "Vlastné miesto")
            );

            // Select this place and show its distance.
            marker.on("click", function () {
                placeList.value = String(i);
                showDistance();
            });

            // Keep the marker so we can remove it later.
            placeMarkers.push(marker);
        }
    }


    // Choose the target and update the two buttons.
    function selectTarget(target, activeButton, otherButton) {
        selectedTarget = target;

        activeButton.classList.add("current");
        otherButton.classList.remove("current");

        // Tell screen readers which button is selected.
        activeButton.setAttribute("aria-pressed", "true");
        otherButton.setAttribute("aria-pressed", "false");

        showDistance();
    }


    // Show the distance and draw a line to the target.
    function showDistance() {
        // Remove the old distance line.
        if (connectionLine) {
            map.removeLayer(connectionLine);
            connectionLine = null;
        }

        // Remove old distance labels, but keep the markers.
        for (let i = 0; i < placeMarkers.length; i++) {
            placeMarkers[i].unbindTooltip();
        }

        // Stop if there is no place to measure from.
        if (places.length === 0) {
            distanceValue.textContent = "—";
            distanceDescription.textContent =
                "Zobrazí sa po pridaní miesta.";
            return;
        }

        // Turn the selected value into an array index.
        const placeNumber = Number(placeList.value);
        const place = places[placeNumber];

        const distance = calculateDistance(
            place,
            selectedTarget
        );

        // Show two digits after the decimal point.
        const distanceText = distance.toFixed(2) + " km";

        distanceValue.textContent = distanceText;
        distanceDescription.textContent =
            place.name + " → " + selectedTarget.name;

        // Draw a line between the place and the target.
        connectionLine = L.polyline(
            [
                [place.latitude, place.longitude],
                [
                    selectedTarget.latitude,
                    selectedTarget.longitude
                ]
            ],
            {
                color: BLUE,
                weight: 3,
                dashArray: "7 7"
            }
        ).addTo(map);

        placeMarkers[placeNumber]
            .bindTooltip(
                place.name + ": " + distanceText,
                {
                    permanent: true,
                    direction: "bottom",
                    className: "map-label"
                }
            )
            .openTooltip();

        // Adjust the map view to fit these points.
        map.fitBounds(
            connectionLine.getBounds(),
            {
                padding: [60, 60],
                maxZoom: 16,
                animate: false
            }
        );
    }


    // Calculate the distance between two places in km.
    function calculateDistance(firstPlace, secondPlace) {
        // The average radius of Earth in km.
        const earthRadius = 6371;

        // Use radians because sin and cos need them.
        const firstLatitude = toRadians(
            firstPlace.latitude
        );

        const secondLatitude = toRadians(
            secondPlace.latitude
        );

        const latitudeDifference = toRadians(
            secondPlace.latitude - firstPlace.latitude
        );

        const longitudeDifference = toRadians(
            secondPlace.longitude - firstPlace.longitude
        );

        // Use the distance formula for a sphere.
        const a =
            Math.sin(latitudeDifference / 2) *
                Math.sin(latitudeDifference / 2) +
            Math.cos(firstLatitude) *
                Math.cos(secondLatitude) *
                Math.sin(longitudeDifference / 2) *
                Math.sin(longitudeDifference / 2);

        const angle =
            2 * Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );

        // Convert the angle to a distance in km.
        return earthRadius * angle;
    }


    // Convert degrees to radians for the distance formula.
    function toRadians(degrees) {
        return degrees * Math.PI / 180;
    }


    // Delete the place selected in the list.
    function deletePlace() {
        if (places.length === 0) {
            return;
        }

        // Remove one place at the selected index.
        places.splice(Number(placeList.value), 1);

        savePlaces();
        drawPlaces();

        // Remove the old distance line.
        if (connectionLine) {
            map.removeLayer(connectionLine);
            connectionLine = null;
        }

        distanceValue.textContent = "—";
        distanceDescription.textContent =
            "Vyberte miesto a cieľ.";

        if (places.length === 0) {
            showSchoolAndHome();
            mapElement.focus();
        }
    }


    // Save the places in this browser.
    function savePlaces() {
        try {
            // Convert the array to text and save it.
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(places)
            );

            storageMessage.hidden = true;

        // Show a message if saving or loading fails.
        } catch (error) {
            storageMessage.hidden = false;
            storageMessage.textContent =
                "Miesta sa nepodarilo uložiť po obnovení stránky.";
        }
    }


    // Read the saved places from this browser.
    function loadPlaces() {
        try {
            // Read the saved text and turn it into an array.
            const savedPlaces = JSON.parse(
                // Use an empty array if there is no saved text.
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            // Use the saved data only if it is an array.
            if (Array.isArray(savedPlaces)) {
                places = savedPlaces;
            }

        // Show a message if saving or loading fails.
        } catch (error) {
            places = [];
            storageMessage.hidden = false;
            storageMessage.textContent =
                "Uložené miesta sa nepodarilo načítať.";
        }
    }
});