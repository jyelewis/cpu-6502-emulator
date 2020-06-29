  .org $0000
  .org $8000

reset:
  ; init x & y registers
  ldx #$01
  ldy #$01

loop:
  ; count to 255, then break to incy
  inx
  CPX #$FF
  BEQ incy

  jmp loop

incy:
  ldx #$01 ; reset x
  iny ; output value of y (larger counter)
  sty $6000
  jmp loop ; count up x again

  .org $fffc
  .word reset
  .word $0000