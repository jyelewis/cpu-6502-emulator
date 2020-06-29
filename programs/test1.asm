  .org $0000
  .org $8000

reset:
  lda #$aa
  sta $6000

loop:
  rol
  sta $6000

  jmp loop

  .org $fffc
  .word reset
  .word $0000