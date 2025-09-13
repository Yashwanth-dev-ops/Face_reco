

import { 
    loadStudentDirectory, saveStudentDirectory, 
    loadAdminDirectory, saveAdminDirectory,
    loadFaceLinks, saveFaceLinks,
    loadAttendance, saveAttendance, 
    loadDepartments, saveDepartments 
} from './storageService';
import { StudentInfo, AdminInfo, AttendanceRecord, Emotion, Designation } from '../types';

const API_LATENCY = 200; // ms

// --- Auth ---
export const loginAdmin = (idNumber: string, password: string): Promise<AdminInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const admins = loadAdminDirectory();
            const user = admins.get(idNumber);
            if (user && user.password === password) {
                if (user.isBlocked) {
                    reject(new Error('This admin account is blocked. Please contact an administrator.'));
                } else {
                    resolve(user);
                }
            } else {
                reject(new Error('Invalid credentials. Please try again.'));
            }
        }, API_LATENCY);
    });
};

export const loginStudent = (rollNumber: string, password: string): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            const user = students.get(rollNumber.toUpperCase());
            if (user && user.password === password) {
                if (user.isBlocked) {
                    reject(new Error('This student account is blocked. Please contact an administrator.'));
                } else {
                    resolve(user);
                }
            } else {
                reject(new Error('Invalid credentials. Please try again.'));
            }
        }, API_LATENCY);
    });
};


// --- Registration ---
export const registerStudent = (student: StudentInfo): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            if (students.has(student.rollNumber)) {
                reject(new Error('A student with this Roll Number already exists.'));
                return;
            }
            // The incoming student object, which may include a photoBase64 string,
            // is stored directly. The storage service handles serialization.
            students.set(student.rollNumber, student);
            saveStudentDirectory(students);
            resolve(student);
        }, API_LATENCY);
    });
};

export const registerAdmin = (admin: AdminInfo): Promise<{ newAdmin: AdminInfo; updatedDepartments: string[] }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const admins = loadAdminDirectory();
            if (admins.has(admin.idNumber)) {
                reject(new Error('An admin with this ID Number already exists.'));
                return;
            }
            
            // Add new department if it doesn't exist
            const departments = loadDepartments();
            if (admin.department && !departments.includes(admin.department)) {
                departments.push(admin.department);
                saveDepartments(departments);
            }
            
            const newAdminWithStatus: AdminInfo = { ...admin, isBlocked: false };

            // The incoming admin object, which may include a photoBase64 string,
            // is stored directly. The storage service handles serialization.
            admins.set(newAdminWithStatus.idNumber, newAdminWithStatus);
            saveAdminDirectory(admins);
            resolve({ newAdmin: newAdminWithStatus, updatedDepartments: departments });
        }, API_LATENCY);
    });
};

// --- Data Fetching ---
export const getStudentDirectory = (): Promise<Map<string, StudentInfo>> => Promise.resolve(loadStudentDirectory());
export const getAdminDirectory = (): Promise<Map<string, AdminInfo>> => {
    const admins = loadAdminDirectory();
    // Create a default principal if none exist
    if (admins.size === 0) {
        admins.set('principal', {
            name: 'Default Principal',
            idNumber: 'principal',
            password: 'admin',
            department: 'Administration',
            designation: Designation.Principal,
            phoneNumber: '1234567890',
            isBlocked: false,
        });
        saveAdminDirectory(admins);
    }
    return Promise.resolve(admins);
};
export const getFaceLinks = (): Promise<Map<number, string>> => Promise.resolve(loadFaceLinks());
export const getAttendance = (): Promise<AttendanceRecord[]> => Promise.resolve(loadAttendance());
export const getDepartments = (): Promise<string[]> => Promise.resolve(loadDepartments());

export const getAllUsersWithPhotos = (): Promise<{ id: string; photoBase64: string }[]> => {
    return new Promise((resolve) => {
        const students = loadStudentDirectory();
        const admins = loadAdminDirectory();
        const userProfiles: { id: string; photoBase64: string }[] = [];

        students.forEach((student, rollNumber) => {
            if (student.photoBase64) {
                userProfiles.push({ id: rollNumber, photoBase64: student.photoBase64 });
            }
        });

        admins.forEach((admin, idNumber) => {
            if (admin.photoBase64) {
                userProfiles.push({ id: idNumber, photoBase64: admin.photoBase64 });
            }
        });
        resolve(userProfiles);
    });
};

export const getUserById = (id: string): Promise<(AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' }) | null> => {
     return new Promise((resolve) => {
        const adminUser = loadAdminDirectory().get(id);
        if (adminUser) {
            resolve({ ...adminUser, userType: 'ADMIN' });
            return;
        }
        const studentUser = loadStudentDirectory().get(id);
        if (studentUser) {
            resolve({ ...studentUser, userType: 'STUDENT' });
            return;
        }
        resolve(null);
     });
};


// --- Data Mutation ---
export const linkFaceToStudent = (persistentId: number, rollNumber: string): Promise<Map<number, string>> => {
    return new Promise((resolve) => {
        const links = loadFaceLinks();
        links.set(persistentId, rollNumber);
        saveFaceLinks(links);
        resolve(links);
    });
};

export const linkNewFaceForStudent = (rollNumber: string): Promise<Map<number, string>> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const links = loadFaceLinks();
            
            if (Array.from(links.values()).includes(rollNumber)) {
                reject(new Error("This student's face is already linked."));
                return;
            }

            const existingIds = Array.from(links.keys());
            const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
            
            links.set(newId, rollNumber);
            saveFaceLinks(links);
            resolve(links);
        }, API_LATENCY);
    });
};

export const deleteStudent = (rollNumber: string): Promise<{updatedStudents: Map<string, StudentInfo>, updatedFaceLinks: Map<number, string>, updatedAttendance: AttendanceRecord[]}> => {
    return new Promise((resolve) => {
        const students = loadStudentDirectory();
        const links = loadFaceLinks();
        const attendance = loadAttendance();

        let persistentIdToDelete: number | null = null;
        for (const [pid, rn] of links.entries()) {
            if (rn === rollNumber) {
                persistentIdToDelete = pid;
                break;
            }
        }

        if (persistentIdToDelete !== null) {
            links.delete(persistentIdToDelete);
            saveFaceLinks(links);
        }
        
        const newAttendance = attendance.filter(record => record.persistentId !== persistentIdToDelete);
        saveAttendance(newAttendance);

        students.delete(rollNumber);
        saveStudentDirectory(students);
        
        resolve({ updatedStudents: students, updatedFaceLinks: links, updatedAttendance: newAttendance });
    });
};

export const toggleStudentBlock = (rollNumber: string): Promise<StudentInfo> => {
     return new Promise((resolve, reject) => {
        const students = loadStudentDirectory();
        const student = students.get(rollNumber);
        if (!student) {
            reject(new Error("Student not found"));
            return;
        }
        const updatedStudent = { ...student, isBlocked: !student.isBlocked };
        students.set(rollNumber, updatedStudent);
        saveStudentDirectory(students);
        resolve(updatedStudent);
     });
};

export const deleteAdmin = (idNumber: string): Promise<Map<string, AdminInfo>> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const adminToDelete = admins.get(idNumber);

        if (!adminToDelete) {
            return reject(new Error("Admin not found."));
        }
        if (adminToDelete.designation === Designation.Principal) {
            return reject(new Error("Cannot delete a Principal account."));
        }

        admins.delete(idNumber);
        saveAdminDirectory(admins);
        resolve(admins);
    });
};

export const toggleAdminBlock = (idNumber: string): Promise<AdminInfo> => {
     return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(idNumber);
        if (!admin) {
            return reject(new Error("Admin not found"));
        }
        if (admin.designation === Designation.Principal) {
            return reject(new Error("Cannot block a Principal account."));
        }
        const updatedAdmin = { ...admin, isBlocked: !admin.isBlocked };
        admins.set(idNumber, updatedAdmin);
        saveAdminDirectory(admins);
        resolve(updatedAdmin);
     });
};


export const addDepartment = (name: string): Promise<string[]> => {
    return new Promise(resolve => {
        const depts = loadDepartments();
        if (!depts.includes(name)) {
            depts.push(name);
            saveDepartments(depts);
        }
        resolve(depts);
    });
};

export const logAttendance = (persistentId: number, emotion: Emotion): Promise<AttendanceRecord[]> => {
    return new Promise(resolve => {
        const attendance = loadAttendance();
        const newRecord = { persistentId, timestamp: Date.now(), emotion };
        const newAttendance = [...attendance, newRecord];
        saveAttendance(newAttendance);
        resolve(newAttendance);
    });
};