<template>
    <span @click="$emit('click')">
        <span v-if="icon == 'mdi-financial-custom-1'">
            <svg :width="size" :height="size" viewBox="0 -1 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12ZM13.41 18.67V18.09C15.15 17.76 16.52 16.76 16.54 14.93C16.54 12.41 14.38 11.54 12.36 11.02C10.34 10.5 9.69 9.95 9.69 9.11C9.69 8.15 10.59 7.47 12.09 7.47C13.35 7.47 13.98 7.96 14.21 8.72C14.31 9.08 14.61 9.34 14.98 9.34H15.24C15.83 9.34 16.25 8.76 16.05 8.21C15.67 7.15 14.8 6.29 13.42 5.95V5.33C13.42 4.6 12.82 4 12.09 4H12.08C11.35 4 10.75 4.6 10.75 5.33V5.93C9.03 6.3 7.64 7.42 7.64 9.14C7.64 11.19 9.34 12.21 11.82 12.81C14.05 13.34 14.49 14.12 14.49 14.95C14.49 15.56 14.05 16.54 12.09 16.54C10.63 16.54 9.87 16.02 9.58 15.27C9.44 14.92 9.14 14.67 8.77 14.67H8.53C7.93 14.67 7.5 15.28 7.73 15.83C8.23 17.06 9.41 17.79 10.74 18.07V18.67C10.74 19.4 11.34 20 12.07 20H12.08C12.81 20 13.41 19.4 13.41 18.67Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-user-actions-custom-1'">
            <svg :width="size" :height="size" class="svg-outlier" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 8H5.5C5.22386 8 5 8.22386 5 8.5V21.5C5 21.7761 5.22386 22 5.5 22H18.5C18.7761 22 19 21.7761 19 21.5V8.5C19 8.22386 18.7761 8 18.5 8H15M12 12.5V2M12 2L9 5M12 2L15 5" :stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-users-custom-1'">
            <svg :width="size" :height="size" viewBox="0 -1 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <mask id="path-1-inside-1" fill="white">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 1.44916C0 0.648808 0.648809 0 1.44916 0H18.2523C19.0527 0 19.7015 0.648809 19.7015 1.44916V22.5508C19.7015 23.3512 19.0527 24 18.2523 24H1.44916C0.64881 24 0 23.3512 0 22.5508V1.44916ZM12.5008 6.50001C12.5008 7.88127 11.3821 9.00002 10.001 9.00002C8.6198 9.00002 7.50112 7.88127 7.50112 6.50001C7.50112 5.11875 8.6198 4 10.001 4C11.3821 4 12.5008 5.11875 12.5008 6.50001ZM5.00098 12.7501C5.00098 11.0875 8.33201 10.25 10.0007 10.25C11.6693 10.25 15.0003 11.0875 15.0003 12.7501V13.3751C15.0003 13.7188 14.7191 14.0001 14.3754 14.0001H5.62594C5.28221 14.0001 5.00098 13.7188 5.00098 13.3751V12.7501ZM4.67552 16C4.23071 16 3.87012 16.3606 3.87012 16.8054C3.87012 17.2502 4.23071 17.6108 4.67552 17.6108H14.9998C15.4446 17.6108 15.8052 17.2502 15.8052 16.8054C15.8052 16.3606 15.4446 16 14.9998 16H4.67552ZM4.67552 19C4.23071 19 3.87012 19.3606 3.87012 19.8054C3.87012 20.2502 4.23071 20.6108 4.67552 20.6108H14.9998C15.4446 20.6108 15.8052 20.2502 15.8052 19.8054C15.8052 19.3606 15.4446 19 14.9998 19H4.67552Z"/>
                </mask>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M0 1.44916C0 0.648808 0.648809 0 1.44916 0H18.2523C19.0527 0 19.7015 0.648809 19.7015 1.44916V22.5508C19.7015 23.3512 19.0527 24 18.2523 24H1.44916C0.64881 24 0 23.3512 0 22.5508V1.44916ZM12.5008 6.50001C12.5008 7.88127 11.3821 9.00002 10.001 9.00002C8.6198 9.00002 7.50112 7.88127 7.50112 6.50001C7.50112 5.11875 8.6198 4 10.001 4C11.3821 4 12.5008 5.11875 12.5008 6.50001ZM5.00098 12.7501C5.00098 11.0875 8.33201 10.25 10.0007 10.25C11.6693 10.25 15.0003 11.0875 15.0003 12.7501V13.3751C15.0003 13.7188 14.7191 14.0001 14.3754 14.0001H5.62594C5.28221 14.0001 5.00098 13.7188 5.00098 13.3751V12.7501ZM4.67552 16C4.23071 16 3.87012 16.3606 3.87012 16.8054C3.87012 17.2502 4.23071 17.6108 4.67552 17.6108H14.9998C15.4446 17.6108 15.8052 17.2502 15.8052 16.8054C15.8052 16.3606 15.4446 16 14.9998 16H4.67552ZM4.67552 19C4.23071 19 3.87012 19.3606 3.87012 19.8054C3.87012 20.2502 4.23071 20.6108 4.67552 20.6108H14.9998C15.4446 20.6108 15.8052 20.2502 15.8052 19.8054C15.8052 19.3606 15.4446 19 14.9998 19H4.67552Z" :fill="currentColor"/>
                <path d="M1.44916 -2C-0.455758 -2 -2 -0.455763 -2 1.44916H2C2 1.75338 1.75338 2 1.44916 2V-2ZM18.2523 -2H1.44916V2H18.2523V-2ZM21.7015 1.44916C21.7015 -0.455763 20.1572 -2 18.2523 -2V2C17.9481 2 17.7015 1.75338 17.7015 1.44916H21.7015ZM21.7015 22.5508V1.44916H17.7015V22.5508H21.7015ZM18.2523 26C20.1573 26 21.7015 24.4558 21.7015 22.5508H17.7015C17.7015 22.2466 17.9481 22 18.2523 22V26ZM1.44916 26H18.2523V22H1.44916V26ZM-2 22.5508C-2 24.4558 -0.455757 26 1.44916 26V22C1.75338 22 2 22.2466 2 22.5508H-2ZM-2 1.44916V22.5508H2V1.44916H-2ZM10.001 11C12.4868 11 14.5008 8.98571 14.5008 6.50001H10.5008C10.5008 6.77683 10.2774 7.00002 10.001 7.00002V11ZM5.50112 6.50001C5.50112 8.9857 7.5151 11 10.001 11V7.00002C9.7245 7.00002 9.50112 6.77683 9.50112 6.50001H5.50112ZM10.001 2C7.5151 2 5.50112 4.01432 5.50112 6.50001H9.50112C9.50112 6.22319 9.7245 6 10.001 6V2ZM14.5008 6.50001C14.5008 4.01431 12.4868 2 10.001 2V6C10.2774 6 10.5008 6.22319 10.5008 6.50001H14.5008ZM10.0007 8.25004C8.9163 8.25004 7.41354 8.50635 6.13129 9.02006C5.48855 9.27756 4.77548 9.64894 4.19102 10.1884C3.59297 10.7404 3.00098 11.5999 3.00098 12.7501H7.00098C7.00098 13.0689 6.82537 13.2003 6.90403 13.1277C6.99628 13.0426 7.22026 12.8929 7.61886 12.7332C8.41928 12.4125 9.41636 12.25 10.0007 12.25V8.25004ZM17.0003 12.7501C17.0003 11.5999 16.4083 10.7404 15.8103 10.1884C15.2258 9.64894 14.5128 9.27756 13.87 9.02006C12.5878 8.50635 11.085 8.25004 10.0007 8.25004V12.25C10.5849 12.25 11.582 12.4125 12.3824 12.7332C12.781 12.8929 13.005 13.0426 13.0973 13.1277C13.1759 13.2003 13.0003 13.0689 13.0003 12.7501H17.0003ZM17.0003 13.3751V12.7501H13.0003V13.3751H17.0003ZM14.3754 16.0001C15.8238 16.0001 17.0003 14.8232 17.0003 13.3751H13.0003C13.0003 12.6144 13.6144 12.0001 14.3754 12.0001V16.0001ZM5.62594 16.0001H14.3754V12.0001H5.62594V16.0001ZM3.00098 13.3751C3.00098 14.8232 4.17751 16.0001 5.62594 16.0001V12.0001C6.38691 12.0001 7.00098 12.6144 7.00098 13.3751H3.00098ZM3.00098 12.7501V13.3751H7.00098V12.7501H3.00098ZM5.87012 16.8054C5.87012 17.4652 5.33528 18 4.67552 18V14C3.12614 14 1.87012 15.256 1.87012 16.8054H5.87012ZM4.67552 15.6108C5.33528 15.6108 5.87012 16.1457 5.87012 16.8054H1.87012C1.87012 18.3548 3.12614 19.6108 4.67552 19.6108V15.6108ZM14.9998 15.6108H4.67552V19.6108H14.9998V15.6108ZM13.8052 16.8054C13.8052 16.1456 14.3401 15.6108 14.9998 15.6108V19.6108C16.5492 19.6108 17.8052 18.3548 17.8052 16.8054H13.8052ZM14.9998 18C14.3401 18 13.8052 17.4652 13.8052 16.8054H17.8052C17.8052 15.256 16.5492 14 14.9998 14V18ZM4.67552 18H14.9998V14H4.67552V18ZM5.87012 19.8054C5.87012 20.4652 5.33528 21 4.67552 21V17C3.12614 17 1.87012 18.256 1.87012 19.8054H5.87012ZM4.67552 18.6108C5.33528 18.6108 5.87012 19.1457 5.87012 19.8054H1.87012C1.87012 21.3548 3.12614 22.6108 4.67552 22.6108V18.6108ZM14.9998 18.6108H4.67552V22.6108H14.9998V18.6108ZM13.8052 19.8054C13.8052 19.1456 14.3401 18.6108 14.9998 18.6108V22.6108C16.5492 22.6108 17.8052 21.3548 17.8052 19.8054H13.8052ZM14.9998 21C14.3401 21 13.8052 20.4652 13.8052 19.8054H17.8052C17.8052 18.256 16.5492 17 14.9998 17V21ZM4.67552 21H14.9998V17H4.67552V21Z" :fill="currentColor" mask="url(#path-1-inside-1)"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-system-navigation-custom-1'">
            <svg :width="size" :height="size" viewBox="-3 -4 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M16.15 0.55L17.54 2.23C17.83 2.57 18 3.02 18 3.5V16C18 17.1 17.1 18 16 18H2C0.9 18 0 17.1 0 16V3.5C0 3.02 0.17 2.57 0.46 2.23L1.84 0.55C2.12 0.21 2.53 0 3 0H15C15.47 0 15.88 0.21 16.15 0.55ZM14.76 2H3.24L2.42 3H15.59L14.76 2ZM2 16V5H16V16H2ZM7.55 11H5L9 7L13 11H10.45V14H7.55V11Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-system-navigation-custom-2'">
            <svg :width="size" :height="size" viewBox="0 -1 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M0.857143 0H11.1429C11.6143 0 12 0.385714 12 0.857143V11.1429C12 11.6143 11.6143 12 11.1429 12H0.857143C0.385714 12 0 11.6143 0 11.1429V0.857143C0 0.385714 0.385714 0 0.857143 0ZM14 12H16V0H14V12ZM18 0V12H20V0H18ZM5.72727 2.52272C6.74182 2.52272 7.56818 3.34908 7.56818 4.36363C7.56818 5.37817 6.74182 6.20454 5.72727 6.20454C4.71273 6.20454 3.88636 5.37817 3.88636 4.36363C3.88636 3.34908 4.71273 2.52272 5.72727 2.52272ZM2.04545 9.47727V10.0909H9.40909V9.47727C9.40909 8.24999 6.95455 7.63636 5.72727 7.63636C4.5 7.63636 2.04545 8.24999 2.04545 9.47727Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-system-navigation-custom-3'">
            <svg :width="size" :height="size" viewBox="-3 -7 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M0 1C0 0.447715 0.447716 0 1 0H17C17.5523 0 18 0.447715 18 1C18 1.55228 17.5523 2 17 2H1C0.447715 2 0 1.55228 0 1ZM0 6C0 6.55228 0.447715 7 1 7H11C11.5523 7 12 6.55228 12 6C12 5.44772 11.5523 5 11 5H1C0.447715 5 0 5.44772 0 6ZM0 11C0 11.5523 0.447715 12 1 12H17C17.5523 12 18 11.5523 18 11C18 10.4477 17.5523 10 17 10H1C0.447716 10 0 10.4477 0 11Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-system-navigation-custom-4'">
            <svg :width="size" :height="size" viewBox="-4 -3 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L9.9899 0L0 10L10 20L12 18L4 10L12 2Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-facility-custom-1'">
            <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6C6 3.79 7.79 2 10 2C12.21 2 14 3.79 14 6V9H15C16.11 9 17 9.9 17 11V19C17 20.11 16.11 21 15 21H5C3.9 21 3 20.11 3 19V11C3 9.9 3.9 9 5 9H12V6C12 4.89 11.11 4 10 4C8.9 4 8 4.89 8 6V7H6V6ZM19 9H21V14H19V9ZM19 16H21V18H19V16ZM10 13C8.9 13 8 13.9 8 15C8 16.11 8.9 17 10 17C11.11 17 12 16.11 12 15C12 13.9 11.11 13 10 13Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-facility-custom-2'">
            <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M8.57143 4C7.62466 4 6.85714 4.69324 6.85714 5.5484V6.50685L4.69266 7.34472C4.27245 7.50739 4 7.88059 4 8.29352V9.67738H20V8.29352C20 7.88059 19.7275 7.50739 19.3073 7.34472L17.1429 6.50685V5.5484C17.1429 4.69324 16.3753 4 15.4286 4H8.57143ZM15.4286 5.63938H8.57143V7.70391H15.4286V5.63938Z" :fill="currentColor"/>
                <path d="M4 20H5.14286C5.77404 20 6.28571 19.5378 6.28571 18.9677V12.7741H17.7143V18.9677C17.7143 19.5378 18.226 20 18.8571 20H20V10.7096H4V20Z" :fill="currentColor"/>
                <path d="M7.42857 13.8064H16.5714V15.8709H7.42857V13.8064Z" :fill="currentColor"/>
                <path d="M16.5714 16.9032H7.42857V18.9677H16.5714V16.9032Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-facility-custom-3'">
            <svg :width="size" :height="size" viewBox="-3 -4 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M1 0C0.447715 0 0 0.447716 0 1V17C0 17.5523 0.447716 18 1 18H3V8H15V18H17C17.5523 18 18 17.5523 18 17V1C18 0.447715 17.5523 0 17 0H1ZM6 2H12V4H6V2ZM5 10H13V12H5V10ZM13 14H5V16H13V14Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-table-actions-custom-1'">
            <svg :width="size" :height="size" viewBox="1 -1 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M4 6C3.44772 6 3 6.44772 3 7C3 7.55228 3.44772 8 4 8H19C19.5523 8 20 7.55228 20 7C20 6.44772 19.5523 6 19 6H4ZM9 17C9 17.5523 9.44772 18 10 18H19C19.5523 18 20 17.5523 20 17C20 16.4477 19.5523 16 19 16H10C9.44771 16 9 16.4477 9 17ZM7 13C6.44772 13 6 12.5523 6 12C6 11.4477 6.44772 11 7 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H7Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-table-actions-custom-2'">
            <svg :width="size" :height="size" viewBox="-5 -3 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M-4.37114e-08 19C-1.95703e-08 19.5523 0.447716 20 1 20C1.55229 20 2 19.5523 2 19L2 1C2 0.447714 1.55228 -6.78525e-08 1 -4.37114e-08C0.447715 -1.95703e-08 -8.54658e-07 0.447714 -8.30516e-07 1L-4.37114e-08 19Z" :fill="currentColor"/>
                <path d="M5 19C5 19.5523 5.44772 20 6 20C6.55229 20 7 19.5523 7 19L7 1C7 0.447714 6.55228 -6.78525e-08 6 -4.37114e-08C5.44771 -1.95703e-08 5 0.447714 5 1L5 19Z" :fill="currentColor"/>
                <path d="M10 19C10 19.5523 10.4477 20 11 20C11.5523 20 12 19.5523 12 19L12 1.00002C12 0.447733 11.5523 1.90056e-05 11 1.90298e-05C10.4477 1.90539e-05 10 0.447733 10 1.00002L10 19Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-table-actions-custom-3'">
            <svg :width="size" :height="size" viewBox="-3 -4 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M-4.48362e-08 16.7861C-2.00738e-08 17.3526 0.459237 17.8118 1.02573 17.8118C1.59223 17.8118 2.05147 17.3526 2.05147 16.7861L2.05147 1.02575C2.05147 0.459251 1.59223 1.70965e-05 1.02573 1.71213e-05C0.459236 1.71461e-05 -7.58505e-07 0.459253 -7.33743e-07 1.02575L-4.48362e-08 16.7861Z" :fill="currentColor"/>
                <path d="M16.7863 2.05156C17.3528 2.05156 17.812 1.59232 17.812 1.02583C17.812 0.45933 17.3528 9.34199e-05 16.7863 9.33704e-05L1.02593 9.19926e-05C0.459437 9.19431e-05 0.000202318 0.459329 0.000202269 1.02583C0.000202219 1.59232 0.459438 2.05156 1.02594 2.05156L16.7863 2.05156Z" :fill="currentColor"/>
                <path d="M13.4857 3.5962L16.6001 7.64193H10.3713L13.4857 3.5962Z" :fill="currentColor"/>
                <path d="M3.59619 13.4858L7.64192 10.3713L7.64192 16.6002L3.59619 13.4858Z" :fill="currentColor"/>
                <path d="M6.29333 12.317H10.7886C11.6327 12.317 12.317 11.6328 12.317 10.7887V6.29341H14.3848V10.7887C14.3848 12.7748 12.7747 14.3849 10.7886 14.3849H6.29333V12.317Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-table-actions-enable'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M17.0685 8.94041L10.6196 16.6791L6.375 12.0486L8.0336 10.5282L10.539 13.2613L15.34 7.5L17.0685 8.94041Z" fill="#00848E"/>
                <rect x="3.5625" y="3.5625" width="16.875" height="16.875" rx="8.4375" stroke="#00848E" stroke-width="1.125"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-table-actions-disable'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="10.5" height="1.5" transform="matrix(-1 0 0 1 17.25 11.25)" fill="#FF6161"/>
                <rect x="-0.5625" y="0.5625" width="16.875" height="16.875" rx="8.4375" transform="matrix(-1 0 0 1 19.875 3)" stroke="#FF6161" stroke-width="1.125"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-custom-active-military'">
            <svg :width="size" :height="size" viewBox="0 0 18 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M17.7239 0.0283203H0.0280762V19.0514L8.876 24.0283L17.7239 19.0514V0.0283203ZM15.7331 15.0702V17.3661L8.876 21.3053L2.01886 17.3661V15.0702L8.876 19.0094L15.7331 15.0702ZM15.7331 11.531V13.8269L8.876 17.7661L2.01886 13.8269V11.531L8.876 15.4702L15.7331 11.531ZM10.1226 5.45492L9 2L7.87743 5.45492H4.24472L7.18364 7.59017L6.06107 11.0451L9 8.90983L11.9389 11.0451L10.8164 7.59017L13.7553 5.45492H10.1226Z" :fill="currentColor"/>
            </svg>
        </span>
        <span v-else-if="icon == 'mdi-system-navigation-transfer'">
            <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"  style="margin-top: 6px;">
                <path d="M14.257 13.7943V10.2616H17.7897V7.90649L22.5 12.028L17.7897 16.1495V13.7943H14.257ZM16.6121 14.9719V18.5046H13.0794V20.8598L8.36914 16.7383L13.0794 12.6168V14.9719H16.6121Z" :fill="currentColor"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 3C1.94772 3 1.5 3.44772 1.5 4V16.1308C1.5 16.6831 1.94772 17.1308 2.5 17.1308H3.85511V9.28064H13.2757V11.4838L13.2757 11.4838V9.27884H15.6308V4C15.6308 3.44772 15.1831 3 14.6308 3H2.5ZM5.42523 13.9906H9.9734L7.90509 15.5607H5.42523V13.9906ZM6.21015 4.57031H10.9204V6.1404H6.21015V4.57031ZM5.42523 10.8502H11.7056V12.4203H5.42523V10.8502Z" :fill="currentColor"/>
            </svg>

        </span>
        <span v-else>
            <v-icon :size="size" :color="currentColor"><slot></slot></v-icon>
        </span>
    </span>
</template>
<script type="text/babel">
    
    export default {
        name: "HbIcon",
        computed: {
            icon(){
                if(this.mdiIcon){
                    return this.mdiIcon;
                }
                else if(this.$slots.default){
                    return this.$slots.default[0].text.trim();
                }
                else {
                    return '';
                }
            },
            currentColor(){
                if(this.hover && this.hoverColor){
                    return this.hoverColor;
                }
                else if(this.hover && !this.hoverColor){
                    return '#101318';
                }
                else if(this.activeStateOff){
                    return this.iconColor;
                }
                else if(this.toggle && this.activeColor){
                    return this.activeColor;
                }
                else if(this.toggle && !this.activeColor){
                    return '#101318';
                }
                else {
                    return this.iconColor;
                }
            },
            iconColor(){
                if(this.color){
                    return this.color;
                } else {
                    return '#637381';
                }
            },
            size(){
                if(this.small){
                    return 16;
                }
                else {
                    return 24;
                }
            }
        },
        props: {
            small: {
                type: Boolean,
                default: false
            },
            activeStateOff: {
                type: Boolean,
                default: false
            },
            color:{
                type: String
            },
            activeColor:{
                type: String
            },
            hoverColor:{
                type: String
            },
            hover:{
                type: Boolean,
                default: false
            },
            toggle:{
                type: Boolean,
                default: false
            },
            mdiIcon:{
                type: String
            }
        },
    }
</script>

<style scoped>

</style>