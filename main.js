const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function timeStrToSeconds(timeStr) {
    timeStr = timeStr.trim();
    let [h, m, sPart] = timeStr.split(":");
    let [s, meridiem] = sPart.split(" "); // split seconds and am/pm
    h = parseInt(h);
    m = parseInt(m);
    s = parseInt(s);
    meridiem = meridiem.toLowerCase();

    if (meridiem === "am" && h === 12) h = 0;      // 12 AM → 0
    if (meridiem === "pm" && h !== 12) h += 12;   // 1 PM → 13
    return h * 3600 + m * 60 + s;
}

function secondsToHMS(seconds) {
    let h = Math.floor(seconds / 3600);
    let rem = seconds % 3600;
    let m = Math.floor(rem / 60);
    let s = rem % 60;
    return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function getShiftDuration(startTime, endTime) {
    let startSec = timeStrToSeconds(startTime);
    let endSec = timeStrToSeconds(endTime);

    let durationSec = endSec - startSec;

    // if endTime < startTime, assume shift goes to next day
    if (durationSec < 0) durationSec += 24 * 3600;

    return secondsToHMS(durationSec);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    // TODO: Implement this function
     function timeToSeconds12(timeStr) {
        timeStr = timeStr.trim();
        let [timePart, modifier] = timeStr.split(" ");
        let [h, m, s] = timePart.split(":").map(Number);

        if (modifier.toLowerCase() === "am" && h === 12) h = 0;
        if (modifier.toLowerCase() === "pm" && h !== 12) h += 12;

        return h * 3600 + m * 60 + s;
    }

    // Convert start and end to seconds
    let startSec = timeToSeconds12(startTime);
    let endSec   = timeToSeconds12(endTime);

    // Delivery hours in seconds
    const deliveryStart = 8 * 3600;   // 8:00:00 AM
    const deliveryEnd   = 22 * 3600;  // 10:00:00 PM

    // Idle before delivery hours
    let idleBefore = 0;
    if (startSec < deliveryStart) {
        idleBefore = Math.min(endSec, deliveryStart) - startSec;
        if (idleBefore < 0) idleBefore = 0;
    }

    // Idle after delivery hours
    let idleAfter = 0;
    if (endSec > deliveryEnd) {
        idleAfter = endSec - Math.max(startSec, deliveryEnd);
        if (idleAfter < 0) idleAfter = 0;
    }

    let totalIdle = idleBefore + idleAfter;

    // Convert seconds back to h:mm:ss
    let hours = Math.floor(totalIdle / 3600);
    let remainder = totalIdle % 3600;
    let minutes = Math.floor(remainder / 60);
    let seconds = remainder % 60;

    return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    // TODO: Implement this function
    function hmsToSeconds(timeStr) {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    let shiftSec = hmsToSeconds(shiftDuration);
    let idleSec  = hmsToSeconds(idleTime);

    let activeSec = shiftSec - idleSec;

    let hours = Math.floor(activeSec / 3600);
    let remainder = activeSec % 3600;
    let minutes = Math.floor(remainder / 60);
    let seconds = remainder % 60;

    return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}
//=============================================================
// function 4: addShiftRecord(textFile, driverID, startTime, endTime, date)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// date: (typeof string) formatted as yyyy-mm-dd
// Returns: nothing (void)
function addShiftRecord(textFile, shiftObj) {
    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content ? content.split("\n") : [];

    // trim input values to avoid false duplicates
    let driverID = shiftObj.driverID.trim();
    let driverName = shiftObj.driverName.trim();
    let date = shiftObj.date.trim();
    let startTime = shiftObj.startTime.trim();
    let endTime = shiftObj.endTime.trim();

    // check duplicate
    for(let line of lines){
        let parts = line.split(",").map(p => p.trim());
        if(parts[0] === driverID && parts[2] === date){
            return {};
        }
    }

    // calculate fields
    let shiftDuration = getShiftDuration(startTime, endTime);
    let idleTime = getIdleTime(startTime, endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(date, activeTime);

    let newRecord = {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quota,
        hasBonus: false
    };

    // prepare line for text file
    let newLine = [
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        quota,
        false
    ].join(",");

    // find last index of same driverID
    let lastIndex = -1;
    for(let i=0;i<lines.length;i++){
        let parts = lines[i].split(",").map(p => p.trim());
        if(parts[0] === driverID){
            lastIndex = i;
        }
    }

    if(lastIndex === -1){
        lines.push(newLine);
    } else {
        lines.splice(lastIndex + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n"));

    return newRecord;
}

// ============================================================
// Function 5: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean (true if met quota, false otherwise)

function metQuota(date, activeTime) {
    function toSeconds(timeStr){
        let [h,m,s] = timeStr.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    let activeSeconds = toSeconds(activeTime);
    let [year, month, day] = date.split("-").map(Number);

    let requiredSeconds;
    if(month === 4 && day >= 10 && day <= 30 && year === 2025){
        requiredSeconds = 6 * 3600;
    } else {
        requiredSeconds = 8 * 3600 + 24*60; // 8:24:00
    }

    return activeSeconds >= requiredSeconds;
}
// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================


function setBonus(textFile, driverID, date, newValue){

 let content = fs.readFileSync(textFile, "utf8").trim();
 let lines = content.split("\n");

 for(let i = 0; i < lines.length; i++){

  let parts = lines[i].split(",");

  if(parts[0] === driverID && parts[2] === date){

   parts[9] = newValue; // update hasBonus
   lines[i] = parts.join(",");

  }

 }

 fs.writeFileSync(textFile, lines.join("\n"));

}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================


function countBonusPerMonth(textFile, driverID, month){
    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content.split("\n");

    let targetMonth = parseInt(month, 10);
    let count = 0;
    let driverFound = false;

    for(let line of lines){
        let parts = line.split(",");

        if(parts[0] === driverID){
            driverFound = true;
            let dateParts = parts[2].split("-");
            let recordMonth = parseInt(dateParts[1], 10);

            // trim and lowercase to avoid string/boolean issues
            if(recordMonth === targetMonth && parts[9].trim().toLowerCase() === "true"){
                count++;
            }
        }
    }

    if(!driverFound) return -1;
    return count;
}
// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================


function getTotalActiveHoursPerMonth(textFile, driverID, month){

 let content = fs.readFileSync(textFile,"utf8").trim();
 let lines = content.split("\n");

 let totalSeconds = 0;

 for(let line of lines){

  let parts = line.split(",");

  if(parts[0] === driverID){

   let dateParts = parts[2].split("-");
   let recordMonth = parseInt(dateParts[1]);

   if(recordMonth === month){

    let [h,m,s] = parts[7].split(":").map(Number);

    totalSeconds += h*3600 + m*60 + s;

   }

  }

 }

 let hours = Math.floor(totalSeconds/3600);
 let remainder = totalSeconds % 3600;

 let minutes = Math.floor(remainder/60);
 let seconds = remainder % 60;

 return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;

}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================


function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month){

 let shifts = fs.readFileSync(textFile,"utf8").trim().split("\n");
 let rates  = fs.readFileSync(rateFile,"utf8").trim().split("\n");

 let dayOff = "";

 // find driver's day off
 for(let line of rates){
  let parts = line.split(",");
  if(parts[0] === driverID){
   dayOff = parts[2];
   break;
  }
 }

 let totalSeconds = 0;

 for(let line of shifts){

  let parts = line.split(",");

  if(parts[0] === driverID){

   let date = parts[2];
   let dateParts = date.split("-");

   let recordMonth = parseInt(dateParts[1]);

   if(recordMonth === month){

    let d = new Date(date);
    let weekday = d.toLocaleString("en-US",{weekday:"long"});

    if(weekday === dayOff){
     continue;
    }

    let day = parseInt(dateParts[2]);

    if(month === 4 && day >= 10 && day <= 30){
     totalSeconds += 6 * 3600;
    }else{
     totalSeconds += 8 * 3600 + 24 * 60;
    }

   }

  }

 }

 totalSeconds -= bonusCount * 2 * 3600;

 let hours = Math.floor(totalSeconds / 3600);
 let remainder = totalSeconds % 3600;

 let minutes = Math.floor(remainder / 60);
 let seconds = remainder % 60;

 return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;

}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================


function getNetPay(driverID, actualHours, requiredHours, rateFile){
    const rates = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let tier = 0, basePay = 0;

   for (let line of rates) {
    let parts = line.split(",").map(p => p.trim());
    if (parts[0] === driverID) {
        tier = Number(parts[3]);      // was parts[1]
        basePay = Number(parts[2]);   // was parts[3]
        break;
    }
}

    let allowance;
    if (tier === 1) allowance = 50;
    else if (tier === 2) allowance = 20;
    else if (tier === 3) allowance = 10;
    else allowance = 3;

    function hmsToSec(timeStr) {
        const [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    const actualSec = hmsToSec(actualHours);
    const requiredSec = hmsToSec(requiredHours);

    if (actualSec >= requiredSec) return basePay;

    const missingSec = requiredSec - actualSec;
    const allowanceSec = allowance * 3600;

    const billableSec = missingSec - allowanceSec;
    if (billableSec <= 0) return basePay;

    const billableHours = Math.floor(billableSec / 3600);
    const deductionRate = Math.floor(basePay / 185);
    const salaryDeduction = billableHours * deductionRate;

    let netPay = basePay - salaryDeduction;
    if (netPay < 0) netPay = 0;

    return netPay;
}
module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
