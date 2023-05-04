Blockly.Arduino['hjn_stepper'] = function(block) {


  Blockly.Arduino.definitions_['Stepper_library'] = '#include <Stepper.h>';
  Blockly.Arduino.definitions_['Stepper_setup'] = 'const int stepsPerRevolution = 512;\n';
  

  var value_in1 = Blockly.Arduino.valueToCode(block, 'IN1', Blockly.Arduino.ORDER_ATOMIC);
  var value_in2 = Blockly.Arduino.valueToCode(block, 'IN2', Blockly.Arduino.ORDER_ATOMIC);
  var value_in3 = Blockly.Arduino.valueToCode(block, 'IN3', Blockly.Arduino.ORDER_ATOMIC);
  var value_in4 = Blockly.Arduino.valueToCode(block, 'IN4', Blockly.Arduino.ORDER_ATOMIC);


  Blockly.Arduino.definitions_['Stepper_begin'] = 'Stepper myStepper(stepsPerRevolution, '+value_in1+', '+value_in3+', '+value_in2+', '+value_in4+');\n';
  Blockly.Arduino.setups_['Stepper_setSpeed'] = 'myStepper.setSpeed(5);\n';

  var code = '';

  return code;
};

Blockly.Arduino['hjn_stepper_step'] = function(block) {
  var value_stepper_step = Blockly.Arduino.valueToCode(block, 'Stepper_step', Blockly.Arduino.ORDER_ATOMIC);
  // TODO: Assemble Arduino into code variable.
  var code = 'myStepper.step('+value_stepper_step+');\n';
  return code;
};

Blockly.Arduino['hjn_split'] = function(block) {
  var value_hjn_string = Blockly.Arduino.valueToCode(block, 'hjn_string', Blockly.Arduino.ORDER_ATOMIC);
  var value_hjn_split = Blockly.Arduino.valueToCode(block, 'hjn_split', Blockly.Arduino.ORDER_ATOMIC);
  var value_hjn_num = Blockly.Arduino.valueToCode(block, 'hjn_num', Blockly.Arduino.ORDER_ATOMIC);
  // TODO: Assemble Arduino into code variable.

  Blockly.Arduino.definitions_['hjn_split_func'] = "String getValue(String data, char separator, int index){\n    int found = 0;\n    int strIndex[] = { 0, -1 };\n    int maxIndex = data.length() - 1;\n    for (int i = 0; i <= maxIndex && found <= index; i++) {\n        if (data.charAt(i) == separator || i == maxIndex) {\n            found++;\n            strIndex[0] = strIndex[1] + 1;\n            strIndex[1] = (i == maxIndex) ? i+1 : i;\n        }\n    }\n    return found > index ? data.substring(strIndex[0], strIndex[1]) : \"error\";\n}\n";

  var code = 'getValue('+value_hjn_string+', '+value_hjn_split+', '+value_hjn_num+')';
  // TODO: Change ORDER_NONE to the correct strength.
  return [code, Blockly.Arduino.ORDER_NONE];
};
