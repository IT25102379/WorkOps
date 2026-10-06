package com.staffmanagement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StaffManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(StaffManagementApplication.class, args);
        System.out.println("\n==================================================================");
        System.out.println(">>> APPLICATION IS RUNNING SUCCESSFULLY!");
        System.out.println(">>> ACCESS THE WEB APP HERE: http://localhost:8080/login");
        System.out.println("==================================================================");
        System.out.println(">>> Login Credentials:");
        System.out.println("    - Employee 1: john.employee@example.com");
        System.out.println("    - Employee 2: sara.employee@example.com");
        System.out.println("    - Manager   : jane.manager@example.com");
        System.out.println("    - HR Officer: alice.hr@example.com");
        System.out.println("==================================================================\n");
    }

}

