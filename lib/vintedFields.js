(function exposeVintedFields(root) {
  const SELECTORS = {
    title: 'input[data-testid="title--input"]',
    description: 'textarea[data-testid="description--input"]',
  };

  function getDocument(doc) {
    return doc || root.document;
  }

  function findListingFields(doc) {
    const targetDocument = getDocument(doc);
    return {
      titleInput: targetDocument.querySelector(SELECTORS.title),
      descriptionInput: targetDocument.querySelector(SELECTORS.description),
    };
  }

  function setNativeFieldValue(field, value) {
    const fieldWindow = field.ownerDocument.defaultView || root;
    const prototype =
      field instanceof fieldWindow.HTMLTextAreaElement
        ? fieldWindow.HTMLTextAreaElement.prototype
        : fieldWindow.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor?.set) {
      descriptor.set.call(field, value);
    } else {
      field.value = value;
    }

    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyListingContent(options = {}, doc) {
    const { title, description, appendDescription = true } = options;
    const { titleInput, descriptionInput } = findListingFields(doc);

    if (titleInput && title !== undefined) {
      setNativeFieldValue(titleInput, title);
    }

    if (descriptionInput && description !== undefined) {
      const currentDescription = descriptionInput.value || "";
      const nextDescription =
        appendDescription && currentDescription.trim()
          ? `${currentDescription.trimEnd()}\n\n${description}`
          : description;
      setNativeFieldValue(descriptionInput, nextDescription);
    }

    return {
      titleFound: Boolean(titleInput),
      descriptionFound: Boolean(descriptionInput),
      titleValue: titleInput?.value || "",
      descriptionValue: descriptionInput?.value || "",
    };
  }

  function clearListingContent(doc) {
    return applyListingContent(
      {
        title: "",
        description: "",
        appendDescription: false,
      },
      doc,
    );
  }

  function testListingContentInjection(options = {}, doc) {
    const {
      title = "__QUICKVINT_CANARY_TITLE__",
      description = "__QUICKVINT_CANARY_DESCRIPTION__",
    } = options;
    const { titleInput, descriptionInput } = findListingFields(doc);
    const result = {
      ok: false,
      titleFound: Boolean(titleInput),
      descriptionFound: Boolean(descriptionInput),
      titleMatched: false,
      descriptionMatched: false,
      error: null,
    };

    if (!titleInput || !descriptionInput) {
      result.error = "missing_fields";
      return result;
    }

    const originalTitle = titleInput.value || "";
    const originalDescription = descriptionInput.value || "";

    try {
      setNativeFieldValue(titleInput, title);
      setNativeFieldValue(descriptionInput, description);

      result.titleMatched = titleInput.value === title;
      result.descriptionMatched = descriptionInput.value === description;
      result.ok = result.titleMatched && result.descriptionMatched;
      if (!result.ok) result.error = "value_mismatch";
      return result;
    } catch (error) {
      result.error = error?.message || "injection_error";
      return result;
    } finally {
      try {
        setNativeFieldValue(titleInput, originalTitle);
        setNativeFieldValue(descriptionInput, originalDescription);
      } catch (restoreError) {
        result.error = result.error || restoreError?.message || "restore_error";
      }
    }
  }

  const api = {
    SELECTORS,
    findListingFields,
    applyListingContent,
    clearListingContent,
    testListingContentInjection,
  };

  root.QuickVintVintedFields = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
