import { appState } from '../state.js';
import { CRITERIA_NAMES, APPLICANTS_PER_PAGE } from '../constants.js';
import { showToast, getLastName } from '../utils.js';

const maxPoints = [3, 2, 2, 1, 1, 1, 3, 2, 2, 2, 1];

export const exportRaterToExcel = (rater, preFilteredRatings = null) => {
    const raterRatings = preFilteredRatings || appState.allRatings.filter(r => r.rater === rater);
    if (raterRatings.length === 0) {
        showToast('No data to export', 'error');
        return;
    }

    raterRatings.sort((a, b) => getLastName(a.applicant).localeCompare(getLastName(b.applicant)));

    const workbook = XLSX.utils.book_new();
    const aoa = [];

    aoa.push(["POTENTIAL & PSYCHOSOCIAL ATTRIBUTES/PERSONALITY TRAITS - BEI"]);
    aoa.push([]);

    const headerRowName = ["CRITERIA/ATTRIBUTES", "POINTS"];
    raterRatings.forEach(r => {
        headerRowName.push(r.applicant.toUpperCase());
    });
    aoa.push(headerRowName);

    const headerRowPos = ["", ""];
    raterRatings.forEach(r => {
        headerRowPos.push(r.position.toUpperCase());
    });
    aoa.push(headerRowPos);

    CRITERIA_NAMES.forEach((criteria, index) => {
        const row = [criteria, maxPoints[index]];
        raterRatings.forEach(r => {
            row.push(r.scores[index] !== undefined ? r.scores[index] : "");
        });
        aoa.push(row);
    });

    const totalRow = ["", "TOTAL SCORE:"];
    raterRatings.forEach(r => {
        totalRow.push(r.totalScore);
    });
    aoa.push(totalRow);

    const raterPosition = raterRatings[0].raterPosition || 'Employee';
    aoa.push([]);
    aoa.push(["", "RATER:"]);
    aoa.push(["", rater.toUpperCase()]);
    aoa.push(["", raterPosition.toUpperCase()]);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    const colWidths = [];
    aoa.forEach((row, rowIdx) => {
        if (rowIdx === 0) return;
        row.forEach((cell, colIdx) => {
            const cellVal = cell !== undefined && cell !== null ? cell.toString() : "";
            const maxLineLen = cellVal.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
            const estimatedWidth = Math.max(10, Math.ceil(maxLineLen * 1.2));
            if (!colWidths[colIdx]) {
                colWidths[colIdx] = { wch: estimatedWidth };
            } else {
                colWidths[colIdx].wch = Math.max(colWidths[colIdx].wch, estimatedWidth);
            }
        });
    });
    worksheet['!cols'] = colWidths;

    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(1, raterRatings.length + 1) } },
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }
    ];

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (!worksheet[cell_ref]) continue;

            const style = {
                font: { name: "Arial", sz: 10 },
                alignment: { vertical: "center", horizontal: "center", wrapText: true }
            };

            // Base borders for table
            const borderStyle = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" }
            };

            if (R === 0) {
                style.font.bold = true;
                style.font.sz = 14;
                style.alignment.horizontal = "left";
            } else if (R === 2 || R === 3) {
                style.font.bold = true;
                style.border = borderStyle;
            } else if (R >= 4 && R <= 14) {
                style.border = borderStyle;
                if (C === 0) {
                    style.alignment.horizontal = "left";
                } else if (C >= 1) {
                    style.alignment.horizontal = "right";
                }
            } else if (R === 15) {
                style.font.bold = true;
                if (C >= 1) {
                    style.border = borderStyle;
                    style.alignment.horizontal = "right";
                }
            } else if (R >= 17) {
                style.alignment.horizontal = "left";
            }

            worksheet[cell_ref].s = style;
        }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Ratings");
    let filename = rater.trim().toLowerCase().replace(/\s+/g, '_');
    if (preFilteredRatings && preFilteredRatings.length > 0) {
        const first = preFilteredRatings[0];
        if (first.division) filename += `_${first.division.toLowerCase()}`;
        if (first.position) filename += `_${first.position.toLowerCase()}`;
    }
    filename += '_ratings.xlsx';
    XLSX.writeFile(workbook, filename);
};

export const exportAllToExcel = () => {
    if (appState.allRatings.length === 0) {
        showToast('No data to export', 'error');
        return;
    }

    const workbook = XLSX.utils.book_new();
    const grouped = {};
    appState.allRatings.forEach(r => {
        if (!grouped[r.rater]) grouped[r.rater] = [];
        grouped[r.rater].push(r);
    });

    Object.keys(grouped).forEach(rater => {
        const raterRatings = grouped[rater];
        raterRatings.sort((a, b) => getLastName(a.applicant).localeCompare(getLastName(b.applicant)));

        const aoa = [];
        aoa.push(["POTENTIAL & PSYCHOSOCIAL ATTRIBUTES/PERSONALITY TRAITS - BEI"]);
        aoa.push([]);

        const headerRowName = ["CRITERIA/ATTRIBUTES", "POINTS"];
        raterRatings.forEach(r => headerRowName.push(r.applicant.toUpperCase()));
        aoa.push(headerRowName);

        const headerRowPos = ["", ""];
        raterRatings.forEach(r => headerRowPos.push(r.position.toUpperCase()));
        aoa.push(headerRowPos);

        CRITERIA_NAMES.forEach((criteria, index) => {
            const row = [criteria, maxPoints[index]];
            raterRatings.forEach(r => row.push(r.scores[index] !== undefined ? r.scores[index] : ""));
            aoa.push(row);
        });

        const totalRow = ["", "TOTAL SCORE:"];
        raterRatings.forEach(r => totalRow.push(r.totalScore));
        aoa.push(totalRow);

        const raterPosition = raterRatings[0].raterPosition || 'Employee';
        aoa.push([]);
        aoa.push(["", "RATER:"]);
        aoa.push(["", rater.toUpperCase()]);
        aoa.push(["", raterPosition.toUpperCase()]);

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        const colWidths = [];
        aoa.forEach((row, rowIdx) => {
            if (rowIdx === 0) return;
            row.forEach((cell, colIdx) => {
                const cellVal = cell !== undefined && cell !== null ? cell.toString() : "";
                const maxLineLen = cellVal.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
                const estimatedWidth = Math.max(10, Math.ceil(maxLineLen * 1.2));
                if (!colWidths[colIdx]) colWidths[colIdx] = { wch: estimatedWidth };
                else colWidths[colIdx].wch = Math.max(colWidths[colIdx].wch, estimatedWidth);
            });
        });
        worksheet['!cols'] = colWidths;
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(1, raterRatings.length + 1) } },
            { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
            { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }
        ];

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if (!worksheet[cell_ref]) continue;

                const style = {
                    font: { name: "Arial", sz: 10 },
                    alignment: { vertical: "center", horizontal: "center", wrapText: true }
                };

                const borderStyle = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                };

                if (R === 0) {
                    style.font.bold = true;
                    style.font.sz = 14;
                    style.alignment.horizontal = "left";
                } else if (R === 2 || R === 3) {
                    style.font.bold = true;
                    style.border = borderStyle;
                } else if (R >= 4 && R <= 14) {
                    style.border = borderStyle;
                    if (C === 0) {
                        style.alignment.horizontal = "left";
                    } else if (C >= 1) {
                        style.alignment.horizontal = "right";
                    }
                } else if (R === 15) {
                    style.font.bold = true;
                    if (C >= 1) {
                        style.border = borderStyle;
                        style.alignment.horizontal = "right";
                    }
                } else if (R >= 17) {
                    style.alignment.horizontal = "left";
                }

                worksheet[cell_ref].s = style;
            }
        }
        XLSX.utils.book_append_sheet(workbook, worksheet, rater.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, "_"));
    });

    XLSX.writeFile(workbook, 'all_submissions.xlsx');
};
