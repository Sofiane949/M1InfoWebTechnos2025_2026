import BufferLoader from "./bufferLoader.js";
// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound, playSound } from './soundutils.js';

window.onload = init;

let apiKey = 'oDL2Gdd0IksB30fuYIPsb3FCAjkhgNb2Vyw2bENg';
//let apiKey = "YOUR API KEY HERE";
let apiUrl = "https://freesound.org/apiv2";
let decodedSounds = [];
let audioCtx;

function init() {
    // get the audio context
    audioCtx = new AudioContext();

    // Inout field and button to set the API key
    const apiKeyInput = document.querySelector("#apiKeyInput");
    const setApiKeyButton = document.querySelector("#apiKeyButton");

    setApiKeyButton.addEventListener("click", () => {
        apiKey = apiKeyInput.value;
        console.log("API key set to:", apiKey);
    });

    apiKeyInput.value = apiKey;

    // init the freesound explorer
    setupFreesoundExplorer();
    console.log("Freesound Explorer initialized.");
}


function setupFreesoundExplorer() {
    const search = document.querySelector("#search");
    const searchButton = document.querySelector("#searchButton");
    const results = document.querySelector("#results");
    const next = document.querySelector("#nextPage");
    const previous = document.querySelector("#previousPage");

    next.disabled = true;
    previous.disabled = true;

    let numPage = 1;


    buildTimeRangeDropdownMenu();

    // add listeners on next and previous buttons
    next.addEventListener("click", (e) => {
        numPage++;
        searchButton.click();
    });

    previous.addEventListener("click", (e) => {
        if (numPage > 1) {
            numPage--;
            searchButton.click();
        }
    });

    // click on search button when press enter
    search.addEventListener("keyup", (e) => {
        if (e.code === "Enter") {
            this.enableKeyboard = true;
            searchButton.click();
            search.blur();
        }
    });

    searchButton.addEventListener("click", (e) => {
        next.disabled = true;
        previous.disabled = true;

        searchButton.disabled = true;
        searchButton.classList.remove("error");
        searchButton.innerHTML = "Searching...";

        results.classList.remove("error");
        results.innerHTML = "";

        let arrayOfSoundObjectURLs = [];

        getSounds(search.value, numPage).then((arrayOfSoundIds) => {
            arrayOfSoundIds.map((soundObject, index) => {
                const id = soundObject[0];
                const name = soundObject[1];
                const urlOfSoundObject = `${apiUrl}/sounds/${id}/?token=${apiKey}`;
                arrayOfSoundObjectURLs.push(urlOfSoundObject);
            });

            // use Promise.all to get all the sound objects
            Promise.all(arrayOfSoundObjectURLs.map((url) => fetch(url)))
                .then((responses) => Promise.all(responses.map((res) => res.json())))
                .then((soundObjects) => {
                    // use Promise.all to get all the sound previews as mp3 files
                    const arrayOfSoundPreviews = soundObjects.map(
                        (soundObject) => soundObject.previews["preview-hq-mp3"]
                    );

                    arrayOfSoundPreviews.forEach((soundPreview, index) => {
                        setResultSound(
                            index,
                            arrayOfSoundIds[index][1],
                            arrayOfSoundPreviews[index]
                        );
                    });

                    let bl = new BufferLoader(
                        audioCtx,
                        arrayOfSoundPreviews,
                        document,
                        (bufferList) => {
                            // when all sounds are loaded, we store them in an array
                            decodedSounds = bufferList;
                        }
                    );

                    // start loading the sounds in background in the explorer
                    bl.loadExplorer();

                    if (!searchButton.classList.contains("error")) {
                        searchButton.textContent = "Search";
                    } else {
                        searchButton.textContent = "Error";
                    }
                    next.disabled = false;
                    if (numPage > 1) {
                        previous.disabled = false;
                    }
                    searchButton.disabled = false;
                });
        });
    });
}

// Builds drop down menu for time range
function buildTimeRangeDropdownMenu() {
    let option = "";

    // The select element
    const time = document.querySelector("#timeRange");
    time.innerHTML = 5;
    time.value = 5;

    // add time options from 1 to 5 seconds with step = 1
    for (let i = 1; i <= 5; i++) {
        option = document.createElement("option");
        option.value = i;
        option.innerHTML = "< " + i + "s";
        time.appendChild(option);
    }

    // add time options from 10 to 20 seconds with step = 5
    for (let i = 10; i <= 20; i += 5) {
        option = document.createElement("option");
        option.value = i;
        option.innerHTML = "< " + i + "s";
        time.appendChild(option);
    }

    // add time option for unlimited duration
    option = document.createElement("option");
    option.value = "unlimited";
    option.innerHTML = "all";
    time.appendChild(option);
};


function getSounds(queryText, nbPage) {
    let time = document.querySelector("#timeRange").value;
    const searchButton = document.querySelector("#searchButton");
    const results = document.querySelector("#results");

    let url = "";

    if (time === "unlimited") {
        url = `${apiUrl}/search/text/?query=${queryText}&token=${apiKey}&page_size=9&page=${nbPage}`;
    } else {
        url = `${apiUrl}/search/text/?query=${queryText}&token=${apiKey}&page_size=9&page=${nbPage}&filter=duration:[0.0 TO ${time}.0]`;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "json";

    return new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const arrayOfSoundIdsAndNames = xhr.response.results.map(
                        (sound) => [sound.id, sound.name]
                    );
                    resolve(arrayOfSoundIdsAndNames);
                } else if (xhr.status === 401) {
                    if (!searchButton.classList.contains("error")) {
                        searchButton.classList.add("error");
                        searchButton.textContent = "Error";
                    }
                    searchButton.disabled = false;

                    results.classList.add("error");
                    results.innerHTML =
                        "Unauthorized : " +
                        xhr.response.detail +
                        "<br><br>Please check your API key.";
                    reject(new Error("Unauthorized : " + xhr.response.detail));
                } else if (xhr.status === 404) {
                    if (!searchButton.classList.contains("error")) {
                        searchButton.classList.add("error");
                        searchButton.textContent = "Error";
                    }
                    searchButton.disabled = false;

                    results.classList.add("error");
                    results.innerHTML = "Sounds not found : " + xhr.response.detail;
                    reject(new Error("Sounds not found : " + xhr.response.detail));
                } else if (xhr.status === 429) {
                    if (!searchButton.classList.contains("error")) {
                        searchButton.classList.add("error");
                        searchButton.textContent = "Error";
                    }
                    searchButton.disabled = false;

                    results.classList.add("error");
                    results.innerHTML = "Too many requests : " + xhr.response.detail;
                    reject(new Error("Too many requests : " + xhr.response.detail));
                } else {
                    if (!searchButton.classList.contains("error")) {
                        searchButton.classList.add("error");
                        searchButton.textContent = "Error";
                    }
                    searchButton.disabled = false;

                    results.classList.add("error");
                    results.innerHTML = "Failed to get sounds : " + xhr.response.detail;
                    reject(new Error("Failed to get sounds : " + xhr.response.detail));
                }
            }
        };
        xhr.send();
    });
}

function setResultSound(index, name, url) {
    // add a div resultExplorer for each sound
    const div = document.createElement("div");
    div.classList.add("resultExplorer");
    div.id = "resultExplorer" + index;
    document.querySelector("#results").appendChild(div);

    // add a button for each sound
    const b = document.createElement("button");
    b.classList.add("resultButton");
    b.id = "result" + index;
    let defaultName = name;
    b.innerHTML = name;
    b.addEventListener("click", (e) => {
        if (decodedSounds[index] == null) return;

        playSound(audioCtx, decodedSounds[index], 0, decodedSounds[index].duration);
    });

    // add the button to the div
   div.appendChild(b);

    // add a progress bar for each sound
    const progressExplorer = document.createElement("progress");
    progressExplorer.classList.add("progressExplorer");
    progressExplorer.id = "progressExplorer" + index;
    progressExplorer.value = 0;
    progressExplorer.max = 1;
    // add the progress bar to the div
    div.appendChild(progressExplorer);
};
