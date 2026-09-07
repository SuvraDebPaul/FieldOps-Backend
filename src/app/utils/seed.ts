import bcrypt from "bcryptjs";
import config from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { AuthProvider, Role, UserStatus } from "../../generated/prisma/enums.js";

export const seedDatabase = async () => {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { email: "admin@gmail.com", role: Role.ADMIN },
    });
    if (existingAdmin) {
      return;
    }

    console.log("Checking database seed...");

    const defaultPasswordHash = await bcrypt.hash(
      "Admin@12345",
      config.BCRYPT_SALT_ROUNDS,
    );

    await prisma.user.upsert({
      where: { email: "admin@gmail.com" },
      update: {},
      create: {
        email: "admin@gmail.com",
        name: "Headquarters Admin",
        password: defaultPasswordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        provider: AuthProvider.CREDENTIALS,
      },
    });

    const skillsData = [
      { name: "Electrical Systems" },
      { name: "HVAC & Cooling" },
      { name: "Industrial Plumbing" },
      { name: "Generator Maintenance" },
      { name: "Hydraulic Systems" },
      { name: "Fire & Safety Systems" },
    ];

    const createdSkills: Record<string, string> = {};
    for (const skill of skillsData) {
      const record = await prisma.skill.upsert({
        where: { name: skill.name },
        update: {},
        create: { name: skill.name },
      });
      createdSkills[skill.name] = record.id;
    }

    const technicians = [
      {
        email: "tech.rahim@gmail.com",
        name: "Rahim Ahmed",
        phone: "+8801711000001",
        employeeCode: "TECH-001",
        baseCity: "Dhaka",
        hourlyRate: 25.0,
        skillNames: ["Electrical Systems", "Generator Maintenance"],
      },
      {
        email: "tech.karim@gmail.com",
        name: "Karim Uddin",
        phone: "+8801711000002",
        employeeCode: "TECH-002",
        baseCity: "Chittagong",
        hourlyRate: 30.0,
        skillNames: ["HVAC & Cooling", "Fire & Safety Systems"],
      },
      {
        email: "tech.salam@gmail.com",
        name: "Salam Chowdhury",
        phone: "+8801711000003",
        employeeCode: "TECH-003",
        baseCity: "Dhaka",
        hourlyRate: 28.0,
        skillNames: ["Industrial Plumbing", "Hydraulic Systems"],
      },
      {
        email: "tech.tanvir@gmail.com",
        name: "Tanvir Hasan",
        phone: "+8801711000004",
        employeeCode: "TECH-004",
        baseCity: "Sylhet",
        hourlyRate: 22.0,
        skillNames: ["Electrical Systems", "HVAC & Cooling"],
      },
    ];

    for (const tech of technicians) {
      const user = await prisma.user.upsert({
        where: { email: tech.email },
        update: {},
        create: {
          email: tech.email,
          name: tech.name,
          phone: tech.phone,
          password: defaultPasswordHash,
          role: Role.TECHNICIAN,
          status: UserStatus.ACTIVE,
          technician: {
            create: {
              employeeCode: tech.employeeCode,
              baseCity: tech.baseCity,
              hourlyRate: tech.hourlyRate,
              isAvailable: true,
              maxDailyJobs: 3,
            },
          },
        },
        include: { technician: true },
      });

      if (user.technician) {
        for (const sName of tech.skillNames) {
          const skillId = createdSkills[sName];
          if (skillId) {
            await prisma.technicianSkill.upsert({
              where: {
                technicianId_skillId: {
                  technicianId: user.technician.id,
                  skillId,
                },
              },
              update: {},
              create: {
                technicianId: user.technician.id,
                skillId,
                level: 3,
              },
            });
          }
        }
      }
    }

    const customers = [
      {
        email: "corp1@apextextiles.com",
        name: "Apex Textiles Ltd",
        companyName: "Apex Group",
        billingAddr: "Plot 12, Tejgaon I/A, Dhaka",
        phone: "+8801811223344",
        sites: [
          {
            label: "Spinning Mill 1",
            address: "Kachpur, Narayanganj",
            city: "Dhaka",
            contactName: "Ashraf Ali",
            contactPhone: "+8801811223345",
          },
          {
            label: "Dyeing Unit",
            address: "Sreepur, Gazipur",
            city: "Dhaka",
            contactName: "Monirul Islam",
            contactPhone: "+8801811223346",
          },
        ],
      },
      {
        email: "operations@bengalplastics.com",
        name: "Bengal Plastics & Agro",
        companyName: "Bengal Group",
        billingAddr: "Agrabad Commercial Area, Chittagong",
        phone: "+8801911556677",
        sites: [
          {
            label: "Main Molding Factory",
            address: "Nasirabad I/A, Chittagong",
            city: "Chittagong",
            contactName: "Faisal Ahmed",
            contactPhone: "+8801911556678",
          },
        ],
      },
      {
        email: "facility@sylhetteagroup.com",
        name: "Sylhet Tea Processing Co.",
        companyName: "Sylhet Holdings",
        billingAddr: "Zindabazar, Sylhet",
        phone: "+8801611778899",
        sites: [
          {
            label: "Packaging Unit A",
            address: "Kulaura Road, Sylhet",
            city: "Sylhet",
            contactName: "Jahangir Alam",
            contactPhone: "+8801611778800",
          },
        ],
      },
    ];

    for (const cust of customers) {
      const user = await prisma.user.upsert({
        where: { email: cust.email },
        update: {},
        create: {
          email: cust.email,
          name: cust.name,
          phone: cust.phone,
          password: defaultPasswordHash,
          role: Role.CUSTOMER,
          status: UserStatus.ACTIVE,
          customer: {
            create: {
              companyName: cust.companyName,
              billingAddr: cust.billingAddr,
            },
          },
        },
        include: { customer: true },
      });

      if (user.customer) {
        for (const site of cust.sites) {
          const existingSite = await prisma.site.findFirst({
            where: {
              customerId: user.customer.id,
              label: site.label,
            },
          });

          if (!existingSite) {
            await prisma.site.create({
              data: {
                customerId: user.customer.id,
                label: site.label,
                address: site.address,
                city: site.city,
                contactName: site.contactName,
                contactPhone: site.contactPhone,
              },
            });
          }
        }
      }
    }

    const categories = [
      {
        name: "Central HVAC Overhaul",
        description: "Comprehensive chiller and AHU maintenance service",
        requiredSkillName: "HVAC & Cooling",
        baseCharge: 150.0,
        estimatedMins: 180,
      },
      {
        name: "Industrial Transformer Servicing",
        description: "Substation and distribution transformer oil & testing",
        requiredSkillName: "Electrical Systems",
        baseCharge: 200.0,
        estimatedMins: 240,
      },
      {
        name: "High-Pressure Pipe Welding & Repair",
        description: "Boiler and pipeline pressure line repairs",
        requiredSkillName: "Industrial Plumbing",
        baseCharge: 120.0,
        estimatedMins: 120,
      },
      {
        name: "Standby Diesel Generator Tune-up",
        description: "Filter replacement, load test, and governor calibration",
        requiredSkillName: "Generator Maintenance",
        baseCharge: 180.0,
        estimatedMins: 150,
      },
      {
        name: "Hydraulic Press & Pump Diagnostics",
        description: "Hydraulic oil leak tracing and pump re-sealing",
        requiredSkillName: "Hydraulic Systems",
        baseCharge: 130.0,
        estimatedMins: 120,
      },
      {
        name: "Industrial Fire Sprinkler Calibration",
        description: "Valve inspection, flow testing, and alarm test",
        requiredSkillName: "Fire & Safety Systems",
        baseCharge: 160.0,
        estimatedMins: 180,
      },
      {
        name: "Electrical Control Panel Rewiring",
        description: "PLC, relay, and breaker diagnosis and repair",
        requiredSkillName: "Electrical Systems",
        baseCharge: 140.0,
        estimatedMins: 120,
      },
      {
        name: "Cooling Tower Descaling & Chemical Treatment",
        description: "Algae removal and fan alignment",
        requiredSkillName: "HVAC & Cooling",
        baseCharge: 175.0,
        estimatedMins: 210,
      },
    ];

    for (const cat of categories) {
      const skillId = createdSkills[cat.requiredSkillName];
      if (skillId) {
        await prisma.serviceCategory.upsert({
          where: { name: cat.name },
          update: {},
          create: {
            name: cat.name,
            description: cat.description,
            requiredSkillId: skillId,
            baseCharge: cat.baseCharge,
            estimatedMins: cat.estimatedMins,
            isActive: true,
          },
        });
      }
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Database seed error:", error);
  }
};
