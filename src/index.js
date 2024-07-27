import './index.css';

/**
 * Drag/Drop feature for Editor.js.
 *
 * @typedef {Object} DragDrop
 * @description Feature's initialization class.
 * @property {Object} api — Editor.js API
 * @property {HTMLElement} holder — DOM element where the editor is initialized.
 * @property {Number} startBlock - Dragged block position.
 * @property {Number} endBlock - Position where the dragged block is gonna be placed.
 * @property {Function} setDragListener - Sets the drag events listener.
 * @property {Function} setDropListener - Sets the drop events listener.
 */
export default class DragDrop {
  /**
   * @param editor: object
   *   editor — Editor.js instance object
   */
  constructor({ configuration, blocks, toolbar, save }, config) {
    const { borderStyle, onDragEnd } = config || {};
    this.toolbar = toolbar;
    this.borderStyle = borderStyle || "1px dashed #aaa";
    this.onDragEndCallback = onDragEnd || (() => {});
    this.api = blocks;
    this.holder =
      typeof configuration.holder === "string"
        ? document.getElementById(configuration.holder)
        : configuration.holder;
    this.readOnly = configuration.readOnly;
    this.startBlock = null;
    this.insertPoint = null;
    this.save = save;
    this.targetInstance = null;
    this.saveInstance();

    requestAnimationFrame(() => {
      this.setDragListener();
      this.setDropListener();
    });
  }

  saveInstance() {
    const editorEl = this.holder.querySelector(".codex-editor");
    editorEl.dragDropInstance = this;
  }

  getInstance(el) {
    const editorEl = el.closest(".codex-editor");
    return editorEl.dragDropInstance;
  }

  /**
   * Sets the cursor at the begining of the drag element
   */
  setElementCursor(element) {
    if (!element) return;
    const range = document.createRange();
    const selection = window.getSelection();

    range.setStart(element.childNodes[0], 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
  }

  /**
   * Sets the drag events listener.
   */
  setDragListener() {
    if (!this.readOnly) {
      const settingsButton = this.holder.querySelector(
        ".ce-toolbar__settings-btn"
      );

      settingsButton.setAttribute("draggable", "true");
      settingsButton.addEventListener("dragstart", () => {
        this.startBlock = this.api.getCurrentBlockIndex();
      });
      settingsButton.addEventListener("dragend", () => {
        this.onDragEnd();
      });
      settingsButton.addEventListener("drag", (event) => {
        this.toolbar.close(); // this closes the toolbar when we start the drag
        const dropTarget = document.querySelector(".ce-block--drop-target");
        if (dropTarget === null) {
          return;
        }
        const targetInstance = this.getInstance(dropTarget);
        this.calcInsertPoint(event, targetInstance, dropTarget);
        if (!this.isTheOnlyBlock() || targetInstance !== this) {
          targetInstance.updateTargetBlock(dropTarget);
          if (this.targetInstance && this.targetInstance !== targetInstance) {
            this.targetInstance.updateTargetBlock(null);
          }
        }
        this.targetInstance = targetInstance;
      });
    }
  }

  updateTargetBlock(block) {
    const allBlocks = this.holder.querySelectorAll(".ce-block");
    this.setElementCursor(block);
    this.setBorderBlocks(allBlocks, block);
  }

  /**
   * Sets dinamically the borders in the blocks when a block is dragged
   * @param {object} allBlocks Contains all the blocks in the holder
   * @param {HTMLElement} blockFocused Is the element where the dragged element will be dropped.
   */

  setBorderBlocks(allBlocks, blockFocused) {
    const insertPoint = this.insertPoint;
    Object.values(allBlocks).forEach((block, index) => {
      const blockContent = block.querySelector(".ce-block__content");
      blockContent.style.removeProperty("border-top");
      blockContent.style.removeProperty("border-bottom");
      if (blockFocused === block) {
        if (insertPoint > index)
          blockContent.style.borderBottom = this.borderStyle;
        else blockContent.style.borderTop = this.borderStyle;
      }
    });
  }

  /**
   * Sets the drop events listener.
   */
  setDropListener() {
    document.addEventListener("drop", (event) => {
      if (
        this.startBlock === null ||
        this.insertPoint === null ||
        this.targetInstance === null
      ) {
        return;
      }
      const { target } = event;
      if (this.targetInstance.holder.contains(target)) {
        this.moveBlocks();
      }
    });
  }

  /**
   * Notify core that read-only mode is suppoorted
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Calculate the position where the dragged block is gonna be placed.
   *
   * @param {DragEvent} event
   */
  calcInsertPoint(event, targetInstance, block) {
    const blockIndex = Array.from(block.parentNode.children).indexOf(block);
    const rect = block.getBoundingClientRect();
    const blockCenter = rect.top + rect.height / 2;
    const insertAfter = event.clientY > blockCenter;
    this.insertPoint = insertAfter ? blockIndex + 1 : blockIndex;
    targetInstance.insertPoint = this.insertPoint;
  }

  isTheOnlyBlock() {
    return this.api.getBlocksCount() === 1;
  }

  onDragEnd() {
    this.updateTargetBlock(null);
    if (this.targetInstance !== this && this.targetInstance) {
      this.targetInstance.updateTargetBlock(null);
      this.onDragEndCallback();
    }
    this.startBlock = null;
    this.targetInstance = null;
  }

  /**
   * Moves the dragged element to the drop position.
   *
   * @see {@link https://editorjs.io/blocks#move}
   */
  async moveBlocks() {
    if (this.targetInstance === this) {
      /**
       * Same editor instance
       */
      if (!this.isTheOnlyBlock()) {
        const endBlock =
          this.startBlock < this.insertPoint
            ? this.insertPoint - 1
            : this.insertPoint;
        this.api.move(endBlock, this.startBlock);
      }
    } else {
      /**
       * Across editor instances
       */
      const startBlock = this.startBlock;
      const insertPoint = this.insertPoint;
      const targetInstance = this.targetInstance;
      const savedData = await this.save();
      const blockData = savedData.blocks[startBlock];
      const { type, data } = blockData;
      this.api.delete(startBlock);
      targetInstance.api.insert(type, data, null, insertPoint, false);
    }
  }
}
