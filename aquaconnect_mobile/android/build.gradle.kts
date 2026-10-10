allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir = File("C:/Users/JAYASREE/.flutter_builds/aquaconnect_mobile_build")
rootProject.layout.buildDirectory.set(newBuildDir)

subprojects {
    val newSubprojectBuildDir = File(newBuildDir, project.name)
    project.layout.buildDirectory.set(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
