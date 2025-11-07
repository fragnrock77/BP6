const dataUrl = "data/sample-data.json";

const state = {
  data: [],
  columns: [],
  selectedColumns: new Set(),
  criteria: [],
  joinOperator: "AND",
  fuzzy: {
    enabled: false,
    threshold: 1,
  },
  exactMatch: false,
};

const elements = {
  columnContainer: document.querySelector("#column-checkboxes"),
  criteriaContainer: document.querySelector("#criteria-container"),
  addCriteriaButton: document.querySelector("#add-criteria"),
  resultsTable: document.querySelector("#results-table"),
  resultsCount: document.querySelector("#results-count"),
  joinOperator: document.querySelector("#join-operator"),
  fuzzyToggle: document.querySelector("#fuzzy-toggle"),
  fuzzyThreshold: document.querySelector("#fuzzy-threshold"),
  fuzzyValue: document.querySelector("#fuzzy-value"),
  exactToggle: document.querySelector("#exact-match-toggle"),
  feedbackMessage: document.querySelector("#feedback-message"),
  criteriaTemplate: document.querySelector("#criteria-template"),
};

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `criteria-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initialise() {
  fetch(dataUrl)
    .then((response) => response.json())
    .then((payload) => {
      state.data = payload;
      state.columns = extractColumns(payload);
      state.columns.forEach((column) => state.selectedColumns.add(column));

      renderColumnCheckboxes();
      ensureAtLeastOneCriteria();
      renderTableHeader();
      elements.fuzzyThreshold.disabled = !state.fuzzy.enabled;
      elements.fuzzyValue.classList.toggle("disabled", !state.fuzzy.enabled);
      elements.fuzzyValue.textContent = state.fuzzy.threshold.toString();
      updateResults();
    })
    .catch((error) => {
      console.error("Impossible de charger les données", error);
      showFeedback(
        "Impossible de charger les données de démonstration. Vérifiez la console pour plus de détails.",
      );
    });
}

function extractColumns(dataset) {
  const columnSet = new Set();
  dataset.forEach((item) => {
    Object.keys(item).forEach((key) => columnSet.add(key));
  });
  return Array.from(columnSet);
}

function renderColumnCheckboxes() {
  elements.columnContainer.innerHTML = "";

  const allId = "column-all";
  const allWrapper = document.createElement("label");
  allWrapper.className = "inline-control";
  allWrapper.innerHTML = `
    <input type="checkbox" id="${allId}" checked />
    <span>Toutes les colonnes</span>
  `;
  elements.columnContainer.appendChild(allWrapper);

  const allCheckbox = allWrapper.querySelector("input");
  allCheckbox.addEventListener("change", (event) => {
    if (event.target.checked) {
      state.columns.forEach((column) => state.selectedColumns.add(column));
    } else {
      state.selectedColumns.clear();
    }
    syncColumnCheckboxes();
    ensureSelectedColumns();
    updateCriteriaColumnOptions();
    updateResults();
  });

  state.columns.forEach((column) => {
    const id = `column-${column}`.replace(/\s+/g, "-");
    const wrapper = document.createElement("label");
    wrapper.className = "inline-control";
    wrapper.innerHTML = `
      <input type="checkbox" id="${id}" data-column="${column}" checked />
      <span>${column}</span>
    `;
    wrapper.querySelector("input").addEventListener("change", (event) => {
      const { checked } = event.target;
      const { column: columnName } = event.target.dataset;
      if (checked) {
        state.selectedColumns.add(columnName);
      } else {
        state.selectedColumns.delete(columnName);
      }
      ensureSelectedColumns();
      syncColumnCheckboxes();
      updateCriteriaColumnOptions();
      updateResults();
    });
    elements.columnContainer.appendChild(wrapper);
  });
}

function syncColumnCheckboxes() {
  const allCheckbox = document.querySelector("#column-all");
  if (!allCheckbox) return;

  const totalColumns = state.columns.length;
  const selectedCount = state.selectedColumns.size;
  allCheckbox.checked = selectedCount === totalColumns;
  allCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalColumns;

  elements.columnContainer
    .querySelectorAll("input[data-column]")
    .forEach((input) => {
      input.checked = state.selectedColumns.has(input.dataset.column);
    });
}

function ensureSelectedColumns() {
  if (state.selectedColumns.size === 0) {
    showFeedback("Sélectionnez au moins une colonne à inspecter.");
  } else {
    clearFeedback();
  }
}

function ensureAtLeastOneCriteria() {
  if (state.criteria.length === 0) {
    addCriteria();
  }
}

function addCriteria() {
  const id = generateId();
  const criteria = {
    id,
    column: "all",
    operator: "contains",
    value: "",
    useRegex: false,
    error: "",
  };
  state.criteria.push(criteria);
  renderCriteria(criteria);
}

function renderCriteria(criteria) {
  const fragment = elements.criteriaTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".criteria-row");
  row.dataset.criteriaId = criteria.id;

  const columnSelect = row.querySelector(".criteria-column");
  populateColumnSelect(columnSelect, criteria.column);

  const operatorSelect = row.querySelector(".criteria-operator");
  operatorSelect.value = criteria.operator;

  const valueInput = row.querySelector(".criteria-value");
  valueInput.value = criteria.value;

  const regexToggle = row.querySelector(".criteria-regex-toggle");
  regexToggle.checked = criteria.useRegex || criteria.operator === "regex";
  regexToggle.disabled = criteria.operator === "regex";

  const errorField = row.querySelector(".error-field");
  errorField.textContent = criteria.error ?? "";

  columnSelect.addEventListener("change", (event) => {
    criteria.column = event.target.value;
    updateResults();
  });

  operatorSelect.addEventListener("change", (event) => {
    criteria.operator = event.target.value;
    if (criteria.operator === "regex") {
      criteria.useRegex = true;
      regexToggle.checked = true;
      regexToggle.disabled = true;
    } else {
      regexToggle.disabled = false;
    }
    updateResults();
  });

  valueInput.addEventListener("input", (event) => {
    criteria.value = event.target.value;
    updateResults();
  });

  regexToggle.addEventListener("change", (event) => {
    criteria.useRegex = event.target.checked;
    if (event.target.checked) {
      criteria.operator = "regex";
      operatorSelect.value = "regex";
      regexToggle.disabled = true;
    } else if (criteria.operator === "regex") {
      criteria.operator = "contains";
      operatorSelect.value = "contains";
    }
    updateResults();
  });

  row.querySelector(".remove-criteria").addEventListener("click", () => {
    state.criteria = state.criteria.filter((item) => item.id !== criteria.id);
    row.remove();
    if (state.criteria.length === 0) {
      addCriteria();
    } else {
      updateResults();
    }
  });

  elements.criteriaContainer.appendChild(fragment);
}

function updateCriteriaColumnOptions() {
  elements.criteriaContainer.querySelectorAll(".criteria-column").forEach((select) => {
    const criteria = state.criteria.find((item) => item.id === select.closest(".criteria-row").dataset.criteriaId);
    populateColumnSelect(select, criteria?.column ?? "all");
  });
}

function populateColumnSelect(selectElement, selectedValue) {
  const previousValue = selectedValue ?? selectElement.value ?? "all";
  selectElement.innerHTML = "";

  const optionAll = document.createElement("option");
  optionAll.value = "all";
  optionAll.textContent = "Toutes";
  selectElement.appendChild(optionAll);

  state.columns.forEach((column) => {
    const option = document.createElement("option");
    option.value = column;
    option.textContent = column;
    option.disabled = !state.selectedColumns.has(column);
    selectElement.appendChild(option);
  });

  if (previousValue && (previousValue === "all" || state.columns.includes(previousValue))) {
    selectElement.value = previousValue;
  } else {
    selectElement.value = "all";
  }
}

function renderTableHeader() {
  const thead = elements.resultsTable.querySelector("thead");
  thead.innerHTML = "";
  const row = document.createElement("tr");
  state.columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    row.appendChild(th);
  });
  thead.appendChild(row);
}

function renderTableRows(rows) {
  const tbody = elements.resultsTable.querySelector("tbody");
  tbody.innerHTML = "";

  rows.forEach((rowData) => {
    const tr = document.createElement("tr");
    state.columns.forEach((column) => {
      const td = document.createElement("td");
      td.textContent = rowData[column] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function updateResults() {
  if (state.data.length === 0) return;

  if (state.selectedColumns.size === 0) {
    showFeedback("Sélectionnez au moins une colonne à inspecter.");
    renderTableRows(state.data);
    updateCount(state.data.length);
    return;
  }

  const criteriaWithErrors = validateCriteria();
  const hasErrors = criteriaWithErrors.some((item) => item.error);
  renderCriteriaErrors(criteriaWithErrors);

  if (hasErrors) {
    showFeedback("Corrigez les critères en erreur pour appliquer la recherche.");
    renderTableRows(state.data);
    updateCount(state.data.length);
    return;
  }

  clearFeedback();
  const filtered = state.data.filter((entry) => evaluateEntry(entry, criteriaWithErrors));
  renderTableRows(filtered);
  updateCount(filtered.length, state.data.length);
}

function renderCriteriaErrors(criteriaWithErrors) {
  criteriaWithErrors.forEach((criteria) => {
    const row = elements.criteriaContainer.querySelector(`.criteria-row[data-criteria-id="${criteria.id}"]`);
    if (!row) return;
    const errorField = row.querySelector(".error-field");
    errorField.textContent = criteria.error ?? "";
  });
}

function validateCriteria() {
  return state.criteria.map((criteria) => {
    const clone = { ...criteria, error: "" };

    if (!criteria.value && criteria.operator !== "regex") {
      return clone;
    }

    if (criteria.useRegex || criteria.operator === "regex") {
      try {
        new RegExp(criteria.value, "i");
      } catch (error) {
        clone.error = `Expression régulière invalide: ${error.message}`;
      }
    }

    return clone;
  });
}

function evaluateEntry(entry, criteriaList) {
  if (criteriaList.length === 0) return true;
  const evaluator = state.joinOperator === "AND" ? all : any;
  return evaluator(criteriaList, (criteria) => evaluateCriteria(entry, criteria));
}

function evaluateCriteria(entry, criteria) {
  if (criteria.error) return false;

  const searchableColumns = criteria.column === "all"
    ? Array.from(state.selectedColumns)
    : [criteria.column];

  if (searchableColumns.length === 0) {
    return false;
  }

  return searchableColumns.some((column) => {
    if (!state.selectedColumns.has(column)) return false;
    const rawValue = entry[column];
    const value = String(rawValue ?? "");
    return matchValue(value, criteria.value, criteria.operator);
  });
}

function matchValue(cellValue, queryValue, operator) {
  const { enabled, threshold } = state.fuzzy;
  const fuzzyActive = enabled && !state.exactMatch && threshold >= 0;

  const safeQuery = queryValue ?? "";
  const normalizedCell = state.exactMatch ? cellValue : cellValue.toLocaleLowerCase();
  const normalizedQuery = state.exactMatch ? safeQuery : safeQuery.toLocaleLowerCase();

  if (operator === "regex") {
    try {
      const regex = new RegExp(queryValue, state.exactMatch ? "" : "i");
      return regex.test(cellValue);
    } catch (error) {
      return false;
    }
  }

  const directMatch = (() => {
    switch (operator) {
      case "contains":
        return normalizedCell.includes(normalizedQuery);
      case "startsWith":
        return normalizedCell.startsWith(normalizedQuery);
      case "endsWith":
        return normalizedCell.endsWith(normalizedQuery);
      case "equals":
        return normalizedCell === normalizedQuery;
      case "notEquals":
        return normalizedCell !== normalizedQuery;
      default:
        return false;
    }
  })();

  if (directMatch) {
    return true;
  }

  if (!fuzzyActive) {
    return false;
  }

  if (operator === "notEquals") {
    return levenshtein(normalizedCell, normalizedQuery) > threshold;
  }

  return levenshtein(normalizedCell, normalizedQuery) <= threshold;
}

function all(items, predicate) {
  for (const item of items) {
    if (!predicate(item)) return false;
  }
  return true;
}

function any(items, predicate) {
  for (const item of items) {
    if (predicate(item)) return true;
  }
  return false;
}

function levenshtein(a, b) {
  if (!a || !b) {
    return Math.max(a.length, b.length);
  }

  const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

function updateCount(current, total = current) {
  elements.resultsCount.textContent = `${current} / ${total} éléments affichés`;
}

function showFeedback(message) {
  elements.feedbackMessage.textContent = message;
}

function clearFeedback() {
  elements.feedbackMessage.textContent = "";
}

function handleJoinOperator(event) {
  state.joinOperator = event.target.value;
  updateResults();
}

function handleFuzzyToggle(event) {
  if (state.exactMatch) {
    event.target.checked = false;
    return;
  }
  state.fuzzy.enabled = event.target.checked;
  elements.fuzzyThreshold.disabled = !state.fuzzy.enabled;
  elements.fuzzyValue.classList.toggle("disabled", !state.fuzzy.enabled);
  if (!state.fuzzy.enabled) {
    elements.fuzzyValue.textContent = state.fuzzy.threshold;
  }
  updateResults();
}

function handleFuzzyThreshold(event) {
  const value = Number.parseInt(event.target.value, 10) || 0;
  state.fuzzy.threshold = value;
  elements.fuzzyValue.textContent = value.toString();
  updateResults();
}

function handleExactToggle(event) {
  state.exactMatch = event.target.checked;
  if (state.exactMatch) {
    state.fuzzy.enabled = false;
    elements.fuzzyToggle.checked = false;
    elements.fuzzyThreshold.disabled = true;
    elements.fuzzyValue.classList.add("disabled");
  } else {
    elements.fuzzyThreshold.disabled = !state.fuzzy.enabled;
    elements.fuzzyValue.classList.toggle("disabled", !state.fuzzy.enabled);
  }
  updateResults();
}

elements.addCriteriaButton.addEventListener("click", () => addCriteria());
elements.joinOperator.addEventListener("change", handleJoinOperator);
elements.fuzzyToggle.addEventListener("change", handleFuzzyToggle);
elements.fuzzyThreshold.addEventListener("input", handleFuzzyThreshold);
elements.exactToggle.addEventListener("change", handleExactToggle);

document.addEventListener("DOMContentLoaded", initialise);
