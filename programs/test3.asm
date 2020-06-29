  .org $0000
  .org $8000

reset:

loop:

  ldx #69
  stx $6000

  lda #01
  cmp #01
  BEQ loop

  jmp loop

  .org $fffc
  .word reset
  .word $0000