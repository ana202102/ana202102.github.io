Blockly.Blocks['hjn_stepper'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("hjn")
        .appendField("步進馬達");
    this.appendValueInput("IN1")
        .setCheck("Number")
        .appendField("IN1");
    this.appendValueInput("IN2")
        .setCheck("Number")
        .appendField("IN2");
    this.appendValueInput("IN3")
        .setCheck("Number")
        .appendField("IN3");
    this.appendValueInput("IN4")
        .setCheck("Number")
        .appendField("IN4");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['hjn_stepper_step'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("步進馬達")
        .appendField("步數");
    this.appendValueInput("Stepper_step")
        .setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['hjn_split'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("切割字串函數");
    this.appendValueInput("hjn_string")
        .setCheck("String")
        .appendField("字串");
    this.appendValueInput("hjn_split")
        .setCheck("String")
        .appendField("分割字元");
    this.appendValueInput("hjn_num")
        .setCheck("Number")
        .appendField("傳回第幾個");
    this.setOutput(true, "String");
    this.setColour(255);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};
