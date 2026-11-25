
let csvDB;

function openCSVDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("BeyondTuitionFiles", 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore("files");
        };

        request.onsuccess = () => {
            csvDB = request.result;
            resolve(csvDB);
        };

        request.onerror = () => reject(request.error);
    });
}

async function saveFileHandle(handle) {
    const db = await openCSVDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("files", "readwrite");
        transaction.objectStore("files").put(handle, "resultsFile");

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getFileHandle() {
    const db = await openCSVDatabase();

    return new Promise((resolve, reject) => {
        const request = db.transaction("files")
            .objectStore("files").get("resultsFile");

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Select or create CSV file
async function chooseCSVFile() {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: "Beyond_Tuition_Results.csv",
            types: [{
                description: "CSV File",
                accept: { "text/csv": [".csv"] }
            }]
        });

        // Create header if file is empty
        const file = await handle.getFile();
        if (file.size === 0) {
            const writer = await handle.createWritable();
            await writer.write(
                "Student Name,Class,Exam Date,Total Questions,Correct Answers,Total Marks,Result\n"
            );
            await writer.close();
        }

        await saveFileHandle(handle);

        alert("CSV file selected successfully!");

    } catch (error) {
        if (error.name !== "AbortError") {
            alert("Unable to select CSV file.");
            console.error(error);
        }
    }
}

// Convert text safely into CSV format
function csvValue(value) {
    return '"' + String(value).replace(/"/g, '""') + '"';
}

// Save each student's result
async function saveExamResult(result) {
    try {
        const handle = await getFileHandle();

        if (!handle) {
            throw new Error("Please select the CSV file first.");
        }

        let permission = await handle.queryPermission({
            mode: "readwrite"
        });

        if (permission !== "granted") {
            permission = await handle.requestPermission({
                mode: "readwrite"
            });
        }

        if (permission !== "granted") {
            throw new Error("CSV file permission denied.");
        }

        const file = await handle.getFile();
        const existingData = await file.text();

        const row = [
            result.name,
            result.class,
            result.date,
            result.totalQuestions,
            result.correctAnswers,
            result.mark + "/25",
            result.status
        ].map(csvValue).join(",") + "\n";

        const writer = await handle.createWritable();

        await writer.write(existingData + row);
        await writer.close();

        return true;

    } catch (error) {
        console.error(error);
        alert(error.message);
        return false;
    }
}
