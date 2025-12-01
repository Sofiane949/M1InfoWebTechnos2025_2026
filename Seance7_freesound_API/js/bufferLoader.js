// This pseudo-class represents a loader for multiple audio files
// from a list of URLs. It uses XMLHttpRequest to load the files
// and the Web Audio API to decode them.
// When all files are loaded and decoded, it calls the onload callback (4th parameter)
// with the list of decoded audio buffers.
function BufferLoader(context, urlList, root, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = [];
    this.loadCount = 0;
    // shadow DOM of the component
    this.root = root;
}

// loadBuffer loads a single audio file from url
// and decodes it, storing the result in bufferList at index
// When all files are loaded, it calls the onload callback
// provided in the constructor.
// It also updates a progress bar in the shadow DOM
BufferLoader.prototype.loadBuffer = function(url, index) {
    // Load buffer asynchronously
    // console.log('file : ' + url + "loading and decoding");

    var request = new XMLHttpRequest();
    request.open("GET", url, true);

    request.responseType = "arraybuffer";

    var loader = this;

    request.onload = () => {
        // Asynchronously decode the audio file data in request.response
        loader.context.decodeAudioData(
                request.response,
                (buffer) => {
                        // console.log("Loaded and decoded track " + (loader.loadCount+1) + 
                        // "/" +  loader.urlList.length + "...");

                    if (!buffer) {
                        alert('error decoding file data: ' + url);
                        return;
                    }
                    loader.bufferList[index] = buffer;

                    //console.log("In bufferLoader.onload bufferList size is " + loader.bufferList.length + " index =" + index);
                    if (++loader.loadCount == loader.urlList.length)
                        loader.onload(loader.bufferList);
                },
                (error) => {
                    console.error('decodeAudioData error', error);
                }
        );
    }

    request.onprogress = (e) => {
            // e.total - 100%
            // e.value - ?
            if(e.total !== 0) {
                //var percent = (e.loaded * 100) / e.total;

                //console.log("loaded " + percent  + "of song " + index);
                let progressBar = document.querySelector("#progressExplorer" + index);
                progressBar.value = e.loaded;
                progressBar.max = e.total;
            }

    }
    
    request.onerror = function() {
        alert('BufferLoader: XHR error');
    }

    request.send();
}

BufferLoader.prototype.loadExplorer = function() {
    // M.BUFFA added these two lines.
    this.bufferList = [];
    this.loadCount = 0;
    //clearLog();
    // console.log("Loading tracks... please wait...");
    // console.log("BufferLoader.prototype.load urlList size = " + this.urlList.length);
    for (var i = 0; i < this.urlList.length; ++i){
        if(this.urlList[i] === "" || this.urlList[i] === null || this.urlList[i] === undefined) {
            this.bufferList[i] = null;
            this.loadCount++;
        }
        else{
            this.loadBuffer(this.urlList[i], i);
        }
    }
}

export default BufferLoader;