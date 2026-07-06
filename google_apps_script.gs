/**
 * QR Code 飲料兌換券管理系統
 * Google Apps Script 後端程式碼
 */

const SHEET_NAME = 'Members';
const ID_COL = 1; // Member ID is in the first column (A)
const NAME_COL = 2; // Name is in the second column (B)
const REMAINING_COL = 3; // Remaining is in the third column (C)

/**
 * 取得 Members 工作表實例
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Members 工作表
 */
function getMembersSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME);
}

/**
 * 根據 Member ID 查找會員所在的行數
 * @param {string} memberId - 會員 ID
 * @returns {number} 會員所在的行數 (1-based)，如果找不到則返回 -1
 */
function findMemberRow(memberId) {
  const sheet = getMembersSheet();
  if (!sheet) return -1;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { // 從第二行開始找，跳過標題行
    if (data[i][ID_COL - 1] === memberId) {
      return i + 1; // 返回 1-based 行數
    }
  }
  return -1;
}

/**
 * 取得指定行數的會員資料
 * @param {number} row - 會員所在的行數 (1-based)
 * @returns {object|null} 會員資料物件，包含 id, name, remaining，如果行數無效則返回 null
 */
function getMemberData(row) {
  const sheet = getMembersSheet();
  if (!sheet || row <= 1) return null; // 跳過標題行
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const memberId = rowData[ID_COL - 1];
  const name = rowData[NAME_COL - 1];
  const remaining = parseInt(rowData[REMAINING_COL - 1], 10);

  // 檢查 remaining 是否為有效數字
  if (isNaN(remaining)) {
    return { id: memberId, name: name, remaining: 0, error: 'Remaining value is not a valid number.' };
  }

  return { id: memberId, name: name, remaining: remaining };
}

/**
 * 更新指定行數的 Remaining 欄位
 * @param {number} row - 會員所在的行數 (1-based)
 * @param {number} newRemaining - 新的剩餘杯數
 * @returns {boolean} 更新是否成功
 */
function updateRemaining(row, newRemaining) {
  const sheet = getMembersSheet();
  if (!sheet || row <= 1) return false;
  sheet.getRange(row, REMAINING_COL).setValue(newRemaining);
  return true;
}

/**
 * 處理 GET 請求，用於查詢會員資訊
 * URL 範例: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?id=A001
 * @param {GoogleAppsScript.Events.DoGet} e - 請求事件物件
 * @returns {GoogleAppsScript.Content.TextOutput} JSON 格式的會員資訊或錯誤訊息
 */
function doGet(e) {
  const memberId = e.parameter.id;
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!memberId) {
    return output.setContent(JSON.stringify({ success: false, message: 'Missing Member ID.' }));
  }

  const row = findMemberRow(memberId);
  if (row === -1) {
    return output.setContent(JSON.stringify({ success: false, message: 'Member not found.' }));
  }

  const memberData = getMemberData(row);
  if (memberData && memberData.error) {
    return output.setContent(JSON.stringify({ success: false, message: memberData.error }));
  }
  if (!memberData) {
    return output.setContent(JSON.stringify({ success: false, message: 'Failed to retrieve member data.' }));
  }

  return output.setContent(JSON.stringify({ success: true, id: memberData.id, name: memberData.name, remaining: memberData.remaining }));
}

/**
 * 處理 POST 請求，用於更新會員的剩餘杯數
 * URL 範例: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 * Request Body (JSON): { "id": "A001" }
 * @param {GoogleAppsScript.Events.DoPost} e - 請求事件物件
 * @returns {GoogleAppsScript.Content.TextOutput} JSON 格式的更新結果或錯誤訊息
 */
function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  let requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (error) {
    return output.setContent(JSON.stringify({ success: false, message: 'Invalid JSON format in request body.' }));
  }

  const memberId = requestData.id;
  const action = requestData.action || 'redeem';
  const points = parseInt(requestData.points, 10) || 0;
  const name = requestData.name || '';

  if (!memberId) {
    return output.setContent(JSON.stringify({ success: false, message: 'Missing Member ID in request body.' }));
  }

  const row = findMemberRow(memberId);

  if (action === 'topup') {
    if (row === -1) {
      // Create new member
      const sheet = getMembersSheet();
      sheet.appendRow([memberId, name, points]);
      return output.setContent(JSON.stringify({ success: true, remaining: points, isNew: true }));
    } else {
      // Add points to existing member
      const memberData = getMemberData(row);
      if (memberData && memberData.error) {
        return output.setContent(JSON.stringify({ success: false, message: memberData.error }));
      }
      const newRemaining = memberData.remaining + points;
      // Optionally update name if provided
      if (name && memberData.name !== name) {
          const sheet = getMembersSheet();
          sheet.getRange(row, NAME_COL).setValue(name);
      }
      const updateSuccess = updateRemaining(row, newRemaining);
      if (updateSuccess) {
        return output.setContent(JSON.stringify({ success: true, remaining: newRemaining, isNew: false }));
      } else {
        return output.setContent(JSON.stringify({ success: false, message: 'Failed to update remaining count.' }));
      }
    }
  }

  // default: action === 'redeem'
  if (row === -1) {
    return output.setContent(JSON.stringify({ success: false, message: 'Member not found.' }));
  }

  const memberData = getMemberData(row);
  if (memberData && memberData.error) {
    return output.setContent(JSON.stringify({ success: false, message: memberData.error }));
  }
  if (!memberData) {
    return output.setContent(JSON.stringify({ success: false, message: 'Failed to retrieve member data.' }));
  }

  let currentRemaining = memberData.remaining;

  if (currentRemaining <= 0) {
    return output.setContent(JSON.stringify({ success: false, message: 'Remaining count is 0. Cannot redeem.' }));
  }

  const newRemaining = currentRemaining - 1;
  const updateSuccess = updateRemaining(row, newRemaining);

  if (updateSuccess) {
    return output.setContent(JSON.stringify({ success: true, remaining: newRemaining }));
  } else {
    return output.setContent(JSON.stringify({ success: false, message: 'Failed to update remaining count.' }));
  }
}

// 為了方便測試，可以添加一個 setup 函數來初始化工作表
function setup() {
  const sheet = getMembersSheet();
  if (!sheet) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheet.insertSheet(SHEET_NAME);
    const newSheet = getMembersSheet();
    newSheet.getRange(1, 1, 1, 3).setValues([['Member ID', 'Name', 'Remaining']]);
    newSheet.getRange(2, 1, 3, 3).setValues([
      ['A001', '王小明', 10],
      ['B002', '陳美麗', 5],
      ['C003', '林大華', 0]
    ]);
  }
}
