#define STA(address, value) ((*(volatile unsigned char *) address) = (value))

#include <stdio.h>
#include <string.h>
#include <time.h>

int __fastcall__ _sin (unsigned x);
int __fastcall__ _cos (unsigned x);

// unsigned char nearest_fib(unsigned char n) {
// 	int a = 0;
// 	int b = 1;
// 	int c = 1;


// 	while (1) {
// 		a = b;
// 		b = c;
// 		c = a + b;

// 		if (c > n) {
// 			return c;
// 		}
// 	}
// }

void printString(const unsigned char *str) {
	STA(0x600a, 69);
	while (*str) {
		STA(0x6001, *str);
		str++;
	}
	STA(0x6001, '\n');
}

void main() {
	// unsigned char i;
	// unsigned char j;

	// unsigned char res;

	// res = (50/4) * 8;
	// STA(0x6000, res);

	// for (j = 3; j > 0; j--) { // count down from 3 -> 0
	// 	for (i = 1; i <= 5; i++) { // count up from 1 -> 5
	// 		STA(0x6000, i); // output to emulator console
	// 	}
	// 	STA(0x6000, 0xFF); // output to emulator console
	// }

	// char str1[6] = "Hello";


	// char str1[1] = "A";
	// char str2[1] = "A";

	// unsigned char res;
	// res = (unsigned char)strncmp(str1, str2, 1);
	// STA(0x6000, res);


	// char str1[1] = "A";
	// char str2[1] = "A";

	// unsigned char res;
	// res = (unsigned char)strncmp("A", "A", 1);
	// STA(0x6000, res);

	// unsigned char len;

	// str1[0] = 'H';

	// str[0] = 'H';
	// str[1] = 'w';
	// str[2] = '\0';

	// STA(0x6000, nearest_fib(11));


	// unsigned char str1[] = "Hello";
	// unsigned char str2[6];

	// strcpy(str2, str1);

	// STA(0x6000, strlen(str2));

	// int val = _sin(180);
	// STA(0x6000, val);

	// int val = 5012 / 1000;
	// STA(0x6000, val);



	char str[15];
	
	// // time_t curr_time = 1593748659;
	// /*
	//     int     tm_sec;
 //    int     tm_min;
 //    int     tm_hour;
 //    int     tm_mday;
 //    int     tm_mon;
 //    int     tm_year;
 //    int     tm_wday;
 //    int     tm_yday;
 //    int     tm_isdst;
 //    */
	struct tm time;
	time.tm_sec = 04;
	time.tm_min = 05;
	time.tm_hour = 14;
	time.tm_mday = 03;
	time.tm_mon = 07;
	time.tm_year = 120;
	time.tm_wday = 4;
	time.tm_yday = 150;
	time.tm_isdst = 0;

// %x - %I:%M%p
	strftime(str, sizeof(str), "%x - %I:%M%p", &time);
	printString(str);

	// STA(0x6000, 1);
	// printString("Hello world!");
	// STA(0x6000, 2);


	// char str[3];

	// // sprintf(str, "%s", "ab"); // working
	// sprintf(str, "%i",69); // not working
	// printString(str);

	// STA(0x6000, str[0]); // output to emulator console
	// STA(0x6000, str[1]); // output to emulator console
	// STA(0x6000, str[2]); // output to emulator console


	STA(0x6005, 0x79); // send pause signal to emulator
}
