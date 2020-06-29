; ---------------------------------------------------------------------------
; vectors.s
; ---------------------------------------------------------------------------
;
; Defines the interrupt vector table.

.import    _init
;.import    _nmi_int, _irq_int

.segment  "VECTORS"

.word	   $00		   ; NMI vector
.addr      _init       ; Reset vector
.word	   $00         ; IRQ/BRK vector