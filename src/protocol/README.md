# Protocol Module

Module responsible for parsing and generating Guacamole protocol.

## File Structure

- **parser.ts** - Guacamole protocol parser

## Overview

The Guacamole protocol is a proprietary protocol used for communication between clients and guacd.
This module handles parsing and generation of protocol instructions.

## Protocol Format

```
<length>.<element>,<length>.<element>,...;
```

Examples:

- `3.nop;` - nop instruction
- `4.size,4.1024,3.768;` - size instruction (with parameters)

## Usage Example

```typescript
import { GuacamoleParser } from './protocol/parser';

const parser = new GuacamoleParser();
parser.oninstruction = (opcode, params) => {
  console.log(`Received: ${opcode}`, params);
};

parser.receive('3.nop;');
```
